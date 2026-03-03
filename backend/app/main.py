from fastapi import FastAPI, Depends, HTTPException, status, Body
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import random
import re
import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

# Configure Gemini AI
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

from . import models, schemas, auth, database
from .database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="TechSiri API")

# Configure CORS - allow production frontend URL from env
_cors_origins = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174"]
if os.getenv("CORS_ORIGINS"):
    _cors_origins.extend(o.strip() for o in os.getenv("CORS_ORIGINS").split(",") if o.strip())
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/register", response_model=schemas.User)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        name=user.name,
        email=user.email,
        hashed_password=hashed_password
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

from fastapi.security import OAuth2PasswordRequestForm

@app.post("/login", response_model=schemas.Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not db_user or not auth.verify_password(form_data.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": db_user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/profile", response_model=schemas.User)
def get_user_profile(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@app.put("/profile", response_model=schemas.User)
def update_user_profile(
    profile_data: schemas.UserBase, 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    current_user.name = profile_data.name
    current_user.email = profile_data.email
    db.commit()
    db.refresh(current_user)
    return current_user

@app.get("/dashboard")
def get_dashboard_stats(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    import json as _json
    import urllib.request
    import collections
    from datetime import datetime, timedelta

    transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    investments = db.query(models.Investment).filter(models.Investment.user_id == current_user.id).all()

    total_balance = sum(t.amount for t in transactions) if transactions else 5420.50
    total_invested = sum(i.current_value for i in investments) if investments else 12500.00

    # Real category breakdown from expenses
    expense_by_cat = collections.defaultdict(float)
    income_total = 0.0
    expense_total = 0.0
    for t in transactions:
        if t.amount < 0:
            expense_by_cat[t.category or 'Other'] += abs(t.amount)
            expense_total += abs(t.amount)
        else:
            income_total += t.amount

    category_breakdown = [{"name": k, "value": round(v, 2)} for k, v in expense_by_cat.items()] or [
        {"name": "Rent", "value": 1500}, {"name": "Food", "value": 600},
        {"name": "Utilities", "value": 300}, {"name": "Entertainment", "value": 400},
        {"name": "Transport", "value": 200},
    ]

    # Real monthly salary vs expense (last 6 months)
    month_income = collections.defaultdict(float)
    month_expense = collections.defaultdict(float)
    now = datetime.utcnow()
    for t in transactions:
        t_date = t.date if isinstance(t.date, datetime) else datetime.combine(t.date, datetime.min.time())
        if (now - t_date).days <= 180:
            label = t_date.strftime("%b")
            if t.amount > 0:
                month_income[label] += t.amount
            else:
                month_expense[label] += abs(t.amount)

    months_order = [(now - timedelta(days=30*i)).strftime("%b") for i in range(5, -1, -1)]
    salary_vs_expense = [
        {"name": m, "salary": round(month_income.get(m, 0), 2), "expense": round(month_expense.get(m, 0), 2)}
        for m in months_order
    ] if transactions else [
        {"name": "Jan", "salary": 5000, "expense": 3200}, {"name": "Feb", "salary": 5000, "expense": 2800},
        {"name": "Mar", "salary": 5000, "expense": 3500}, {"name": "Apr", "salary": 5000, "expense": 3000},
    ]

    # Savings rate & health score
    savings_pct = round(((income_total - expense_total) / income_total * 100), 1) if income_total > 0 else 35
    savings_pct = max(0, min(100, savings_pct))
    fraud_alerts = db.query(models.FraudAlert).filter(models.FraudAlert.user_id == current_user.id, models.FraudAlert.status == "flagged").count()
    health_score = max(0, min(100, int(savings_pct * 0.5 + (50 if fraud_alerts == 0 else max(0, 50 - fraud_alerts * 10)))))

    # Fetch AI suggestion via Gemini
    ai_suggestion = None
    if GEMINI_API_KEY:
        tip_prompt = f"""You are TechSiri, a smart personal finance AI. Analyze this user's financial data and generate EXACTLY 3 short, personalized financial suggestions. Total response must be UNDER 100 words. Use numbered list (1. 2. 3.). Be direct and specific.

User: {current_user.name} | Date: {now.strftime('%A, %d %B %Y')}

TODAY'S FINANCIAL SNAPSHOT:
- Balance: ₹{total_balance:,.2f}
- Income: ₹{income_total:,.2f}
- Expenses: ₹{expense_total:,.2f}
- Savings Rate: {savings_pct:.1f}%
- Top Spending Category: {max(expense_by_cat, key=expense_by_cat.get) if expense_by_cat else 'N/A'} (₹{max(expense_by_cat.values()) if expense_by_cat else 0:,.0f})
- Investment Portfolio: ₹{total_invested:,.2f}
- Fraud Alerts: {fraud_alerts}
- Health Score: {health_score}/100

Analyze spending pattern, risk level, and investment balance. Give 3 actionable suggestions. Under 100 words. No markdown — just 1. 2. 3."""


        try:
            req_body = _json.dumps({"contents": [{"parts": [{"text": tip_prompt}]}]}).encode("utf-8")
            req = urllib.request.Request(
                f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}",
                data=req_body, headers={"Content-Type": "application/json"}, method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                ai_suggestion = _json.loads(resp.read().decode())["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception:
            ai_suggestion = "Keep tracking your expenses daily to stay on top of your financial goals! 💡"

    return {
        "balance": round(total_balance, 2),
        "invested": round(total_invested, 2),
        "net_worth": round(total_balance + total_invested, 2),
        "income": round(income_total, 2),
        "expenses": round(expense_total, 2),
        "savingsPercentage": savings_pct,
        "healthScore": health_score,
        "salaryVsExpense": salary_vs_expense,
        "categoryBreakdown": category_breakdown,
        "recent_transactions": [
            {"id": t.id, "description": t.description, "amount": t.amount, "category": t.category,
             "date": str(t.date), "is_fraudulent": t.is_fraudulent}
            for t in sorted(transactions, key=lambda x: x.date, reverse=True)[:5]
        ],
        "ai_suggestion": ai_suggestion,
        "ai_insights": "Your spending analysis has been updated with real transaction data."
    }


import re

@app.post("/chat", response_model=schemas.ChatResponse)
def chat_with_ai(
    chat_req: schemas.ChatRequest, 
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    message = chat_req.message.lower()
    options = []
    ai_response = ""
    data = None
    
    # 1. Check for functional commands (Regex Parsing)
    # Pattern: add expense $50 for pizza / spent 20 on coffee
    expense_match = re.search(r'(?:add\s*expense|spent|cost|pay|paid|buy|bought)\s*[$€£]?\s*([\d\.]+)(?:\s*(?:for|on|in|to|at)\s*(.+))?', message)
    # Pattern: add income 1000 from salary / received 500
    income_match = re.search(r'(?:add\s*income|received|got|salary|earned)\s*[$€£]?\s*([\d\.]+)(?:\s*(?:from|for)\s*(.+))?', message)
    # Pattern: add investment 100 in btc / invested 500 in apple
    investment_match = re.search(r'(?:invested|investment|buy\s*asset|purchase)\s*[$€£]?\s*([\d\.]+)(?:\s*(?:in|of|for)\s*(.+))?', message)
    
    # Flags for partial matches (missing amount)
    partial_expense = any(word in message for word in ["add expense", "new expense", "log expense"])
    partial_income = any(word in message for word in ["add income", "new income", "log income"])
    
    profile_match = any(word in message for word in ["profile", "who am i", "my info", "account info"]) 
    undo_match = any(word in message for word in ["undo", "delete last", "remove last", "rollback"])
    breakdown_match = any(word in message for word in ["breakdown", "category", "pie chart", "spending by", "show categories"])
    security_match = any(word in message for word in ["security", "fraud", "alert", "suspicious"])

    if undo_match:
        last_t = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).order_by(models.Transaction.date.desc()).first()
        if last_t:
            db.delete(last_t)
            db.commit()
            ai_response = f"🗑️ Done! I've removed your last transaction: '{last_t.description}' (${abs(last_t.amount):,.2f})."
            options = ["📊 Show Dashboard", "💸 List Transactions"]
        else:
            ai_response = "I couldn't find any recent transactions to undo."
            options = ["Add Expense", "Check Balance"]

    elif profile_match:
        ai_response = f"Here are your profile details, {current_user.name}:"
        options = ["Edit Profile", "Security Settings", "📊 Show Dashboard"]
        data = {
            "type": "profile_widget",
            "user": {
                "name": current_user.name,
                "email": current_user.email,
                "joined": "March 2024",
                "tier": "Premium Member"
            }
        }

    elif security_match:
        alerts = db.query(models.FraudAlert).filter(models.FraudAlert.user_id == current_user.id, models.FraudAlert.status == "flagged").all()
        if not alerts:
            ai_response = "🛡️ Your account is secure. No fraud alerts or suspicious activities found."
            options = ["Enable 2FA", "Security Settings", "Check Balance"]
        else:
            ai_response = f"⚠️ I've detected {len(alerts)} suspicious activities. Would you like to review them now?"
            options = ["Review Alerts", "Lock Account", "Contact Support"]

    elif breakdown_match:
        transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id, models.Transaction.amount < 0).all()
        categories = {}
        for t in transactions:
            cat = t.category or "General"
            categories[cat] = categories.get(cat, 0) + abs(t.amount)
        
        chart_data = [{"name": k, "value": v} for k, v in categories.items()]
        ai_response = "Here is your spending breakdown by category:"
        options = ["📊 Show Dashboard", "Set Budgets"]
        data = {
            "type": "pie_chart_widget",
            "chartData": chart_data
        }

    elif expense_match:
        amount = float(expense_match.group(1))
        description = expense_match.group(2) or "Uncategorized Expense"
        new_transaction = models.Transaction(
            description=description.strip(),
            amount=-abs(amount),
            category="Expense",
            user_id=current_user.id
        )
        db.add(new_transaction)
        db.commit()
        ai_response = f"✅ Expense Recorded: -${amount:.2f} for '{description.strip()}'."
        options = ["Check Balance", "Recent Transactions", "Monthly Breakdown"]

    elif income_match:
        amount = float(income_match.group(1))
        source = income_match.group(2) or "Income Source"
        new_transaction = models.Transaction(
            description=source.strip(),
            amount=abs(amount),
            category="Income",
            user_id=current_user.id
        )
        db.add(new_transaction)
        db.commit()
        ai_response = f"💰 Income Added: +${amount:.2f} from '{source.strip()}'. Nice work!"
        options = ["Check Balance", "Recent Transactions"]

    elif investment_match:
        amount = float(investment_match.group(1))
        asset = investment_match.group(2) or "New Asset"
        new_investment = models.Investment(
            asset_name=asset.title().strip(),
            amount_invested=amount,
            current_value=amount,
            user_id=current_user.id
        )
        db.add(new_investment)
        db.commit()
        ai_response = f"📈 Investment Portfolio Updated: Added ${amount:.2f} in '{asset.title().strip()}'."
        options = ["View Portfolio", "Check Balance"]


    elif partial_expense:
        ai_response = "Sure, I can log an expense for you. How much did you spend and on what? (e.g., 'spent 50 for lunch')"
        options = ["spent 20 for dinner", "spent 100 for rent", "Check Balance"]

    elif partial_income:
        ai_response = "Great! How much income did you receive and from where? (e.g., 'received 1000 from salary')"
        options = ["received 5000 from job", "received 20 from gift", "Check Balance"]

    # 2. Hierarchical / Guided Flow Logic
    elif any(word in message for word in ["hi", "hello", "hey", "start", "options", "help"]):
        ai_response = f"Hello {current_user.name}! I'm TechSiri. I can show you your dashboard, list transactions, or manage your investments right here!"
        options = ["📊 Show Dashboard", "💸 List Transactions", "📈 View Portfolio", "🔒 Security Check"]
        
    elif any(word in message for word in ["dashboard", "overview", "summary"]):
        transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
        total_spent = sum(t.amount for t in transactions if t.amount < 0)
        total_income = sum(t.amount for t in transactions if t.amount > 0)
        
        ai_response = f"Here is your financial overview. You've spent ${abs(total_spent):,.2f} and earned ${total_income:,.2f} recently."
        options = ["Detailed Breakdown", "Check Balance"]
        # Structured data for Dashboard Widget
        data = {
            "type": "dashboard_widget",
            "stats": {
                "balance": sum(t.amount for t in transactions),
                "spent": abs(total_spent),
                "income": total_income
            },
            "chartData": [
                {"name": "Week 1", "spent": 400},
                {"name": "Week 2", "spent": 300},
                {"name": "Week 3", "spent": 500},
                {"name": "Week 4", "spent": 200},
            ]
        }
        
    elif any(word in message for word in ["list transactions", "history", "all transactions"]):
        transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).order_by(models.Transaction.date.desc()).limit(10).all()
        ai_response = "Here are your recent transactions:"
        options = ["📊 Show Dashboard", "Add Expense"]
        data = {
            "type": "transaction_list",
            "items": [
                {"id": t.id, "description": t.description, "amount": t.amount, "date": str(t.date), "category": t.category}
                for t in transactions
            ]
        }

    elif any(word in message for word in ["portfolio", "view portfolio", "investments list"]):
        investments = db.query(models.Investment).filter(models.Investment.user_id == current_user.id).all()
        ai_response = "Here is your current investment portfolio:"
        options = ["📊 Show Dashboard", "Add Investment"]
        data = {
            "type": "investment_list",
            "items": [
                {"id": i.id, "asset": i.asset_name, "invested": i.amount_invested, "current": i.current_value}
                for i in investments
            ]
        }
            
    elif "balance" in message:
        transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
        balance = sum(t.amount for t in transactions) if transactions else 5420.50
        ai_response = f"Your current balance is ${balance:,.2f}.\nWould you like a breakdown or to see recent transactions?"
        options = ["Show Transactions", "Monthly Expense Breakdown"]
        
    elif any(word in message for word in ["transaction", "spent", "spending", "show transactions"]):
        transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).order_by(models.Transaction.date.desc()).limit(5).all()
        if not transactions:
            ai_response = "I couldn't find any recent transactions. Try saying 'spent 20 on coffee'!"
            options = ["💰 Check Balance"]
        else:
            t_list = "\n".join([f"• {t.description}: ${t.amount:,.2f}" for t in transactions])
            ai_response = f"Here are your latest activities:\n{t_list}"
            options = ["Expense Breakdown", "Check Balance"]
            data = {
                "type": "transaction_list",
                "items": [
                    {"id": t.id, "description": t.description, "amount": t.amount, "date": str(t.date), "category": t.category}
                    for t in transactions
                ]
            }
            
    elif "investment" in message:
        investments = db.query(models.Investment).filter(models.Investment.user_id == current_user.id).all()
        if not investments:
            ai_response = "Your portfolio is empty. Try 'invested 100 in Bitcoin'!"
            options = ["Learn About Investing", "Check Balance"]
        else:
            total_val = sum(i.current_value for i in investments)
            ai_response = f"Your total investment portfolio is now at ${total_val:,.2f}."
            options = ["Detailed Asset View", "Check Balance"]
            
    else:
        # General conversation — use Gemini AI to respond naturally
        if GEMINI_API_KEY:
            import json as _json
            import urllib.request, urllib.error

            # Give Gemini context about the user
            transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
            investments = db.query(models.Investment).filter(models.Investment.user_id == current_user.id).all()
            balance = sum(t.amount for t in transactions) if transactions else 0
            total_invested = sum(i.amount_invested for i in investments) if investments else 0

            system_context = f"""You are TechSiri, a smart, friendly, and helpful AI financial assistant built into a personal finance app.
You are chatting with {current_user.name}. Here is their current financial snapshot:
- Account Balance: ${balance:,.2f}
- Total Invested: ${total_invested:,.2f}
- Number of Transactions: {len(transactions)}
- Number of Investments: {len(investments)}

You can help with: financial advice, budgeting tips, investment guidance, answering general questions, or just casual conversation.
Be concise (2-4 sentences), warm, and helpful. Use emojis sparingly to feel conversational.
Do NOT ask for personal data or mention you are an AI model. Just respond naturally as TechSiri."""

            gemini_prompt = f"{system_context}\n\nUser says: {chat_req.message}\n\nTechSiri:"

            request_body = {"contents": [{"parts": [{"text": gemini_prompt}]}]}
            url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

            try:
                req_data = _json.dumps(request_body).encode("utf-8")
                req = urllib.request.Request(url, data=req_data, headers={"Content-Type": "application/json"}, method="POST")
                with urllib.request.urlopen(req, timeout=15) as resp:
                    raw = resp.read().decode("utf-8")
                api_response = _json.loads(raw)
                ai_response = api_response["candidates"][0]["content"]["parts"][0]["text"].strip()
                options = ["📊 Show Dashboard", "💰 Check Balance", "💸 List Transactions", "📈 View Portfolio"]
            except Exception:
                ai_response = "I'm here to help! You can ask me about your balance, transactions, investments, or anything financial. 💬"
                options = ["💰 Check Balance", "📊 Recent Transactions", "📈 Investment Performance"]
        else:
            ai_response = "I'm here to help with your finances! Try asking about your balance, expenses, or investments. 💬"
            options = ["💰 Check Balance", "📊 Recent Transactions", "📈 Investment Performance"]

    # Save to history
    new_message = models.ChatMessage(message=chat_req.message, response=ai_response, user_id=current_user.id)
    db.add(new_message)
    db.commit()
    
    return {"response": ai_response, "options": options, "data": data}

# Transactions Routes
@app.get("/transactions", response_model=List[schemas.Transaction])
def get_transactions(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).order_by(models.Transaction.date.desc()).all()

@app.post("/transactions", response_model=schemas.Transaction)
def create_transaction(transaction: schemas.TransactionCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_transaction = models.Transaction(**transaction.model_dump(), user_id=current_user.id)
    db.add(new_transaction)
    db.commit()
    db.refresh(new_transaction)
    return new_transaction

@app.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    transaction = db.query(models.Transaction).filter(models.Transaction.id == transaction_id, models.Transaction.user_id == current_user.id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted"}

# Investments Routes
@app.get("/investments", response_model=List[schemas.Investment])
def get_investments(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Investment).filter(models.Investment.user_id == current_user.id).all()

@app.post("/investments", response_model=schemas.Investment)
def create_investment(investment: schemas.InvestmentCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_investment = models.Investment(**investment.model_dump(), user_id=current_user.id)
    db.add(new_investment)
    db.commit()
    db.refresh(new_investment)
    return new_investment

@app.delete("/investments/{investment_id}")
def delete_investment(investment_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    investment = db.query(models.Investment).filter(models.Investment.id == investment_id, models.Investment.user_id == current_user.id).first()
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    db.delete(investment)
    db.commit()
    return {"message": "Investment deleted"}

# Fraud Alerts Routes
@app.get("/fraud-alerts", response_model=List[schemas.FraudAlert])
def get_fraud_alerts(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    return db.query(models.FraudAlert).filter(models.FraudAlert.user_id == current_user.id).all()

@app.post("/fraud-alerts", response_model=schemas.FraudAlert)
def create_fraud_alert(alert: schemas.FraudAlertCreate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    new_alert = models.FraudAlert(**alert.model_dump(), user_id=current_user.id)
    db.add(new_alert)
    db.commit()
    db.refresh(new_alert)
    return new_alert

@app.put("/fraud-alerts/{alert_id}", response_model=schemas.FraudAlert)
def update_fraud_alert_status(
    alert_id: int,
    status_update: dict = Body(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
):
    alert = db.query(models.FraudAlert).filter(models.FraudAlert.id == alert_id, models.FraudAlert.user_id == current_user.id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Fraud alert not found")
    alert.status = status_update.get("status")
    db.commit()
    db.refresh(alert)
    return alert

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/fraud-score")
def calculate_fraud_score(
    payload: schemas.RiskAssessmentRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Calculate a structured risk score based on 6 transaction factors and save to DB."""
    import json as _json
    from datetime import datetime

    risk_score = 0
    reasons = []

    # Compute user's average transaction amount (absolute)
    user_transactions = db.query(models.Transaction).filter(models.Transaction.user_id == current_user.id).all()
    amounts = [abs(t.amount) for t in user_transactions if t.amount != 0]
    avg_amount = sum(amounts) / len(amounts) if amounts else 1000.0

    # Rule 1: Transaction amount > 5x user's average
    if payload.transaction_amount > 5 * avg_amount:
        risk_score += 30
        reasons.append(f"Transaction amount (${payload.transaction_amount:,.2f}) is more than 5x your average (${avg_amount:,.2f})")

    # Rule 2: New device
    if payload.is_new_device:
        risk_score += 20
        reasons.append("Transaction initiated from an unrecognized new device")

    # Rule 3: Different IP/country from usual
    if payload.country and payload.country.lower() not in ["india", "in", "local", ""]:
        risk_score += 30
        reasons.append(f"Transaction origin '{payload.country}' differs from your usual location")
    elif payload.ip_address and payload.ip_address not in ["127.0.0.1", "localhost", ""]:
        # If IP provided but country unknown, consider foreign
        risk_score += 15
        reasons.append(f"Transaction from unfamiliar IP address: {payload.ip_address}")

    # Rule 4: Newly added beneficiary (< 24 hours)
    if payload.beneficiary_added_hours_ago is not None and payload.beneficiary_added_hours_ago < 24:
        risk_score += 25
        reasons.append(f"Beneficiary was added only {payload.beneficiary_added_hours_ago:.1f} hours ago (< 24 hours)")

    # Rule 5: Failed OTP attempts > 2
    if payload.failed_otp_attempts > 2:
        risk_score += 20
        reasons.append(f"{payload.failed_otp_attempts} failed OTP attempts detected on this session")

    # Rule 6: Transaction outside usual active hours (10am–10pm = hours 10–22)
    if payload.transaction_hour < 6 or payload.transaction_hour > 22:
        risk_score += 10
        reasons.append(f"Transaction at {payload.transaction_hour:02d}:00 is outside normal active hours (06:00–22:00)")

    # Determine risk level and action
    if risk_score >= 70:
        risk_level = "High Risk"
        final_action = "Block"
    elif risk_score >= 40:
        risk_level = "Suspicious"
        final_action = "Require OTP"
    else:
        risk_level = "Safe"
        final_action = "Approve"

    origin = {
        "ip_address": payload.ip_address or "Unknown",
        "city": payload.city or "Unknown",
        "country": payload.country or "Unknown",
    }

    # Save to DB
    assessment = models.RiskAssessment(
        transaction_description=payload.transaction_description,
        transaction_amount=payload.transaction_amount,
        risk_score=risk_score,
        risk_level=risk_level,
        final_action=final_action,
        reasons=_json.dumps(reasons),
        ip_address=payload.ip_address,
        city=payload.city,
        country=payload.country,
        user_id=current_user.id,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "reasons": reasons,
        "origin": origin,
        "final_action": final_action,
        "id": assessment.id,
        "created_at": str(assessment.created_at),
    }

@app.get("/fraud-score/history")
def get_risk_history(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    import json as _json
    assessments = db.query(models.RiskAssessment).filter(
        models.RiskAssessment.user_id == current_user.id
    ).order_by(models.RiskAssessment.created_at.desc()).limit(20).all()
    return [
        {
            "id": a.id,
            "description": a.transaction_description,
            "amount": a.transaction_amount,
            "risk_score": a.risk_score,
            "risk_level": a.risk_level,
            "final_action": a.final_action,
            "reasons": _json.loads(a.reasons) if a.reasons else [],
            "origin": {"ip_address": a.ip_address or "", "city": a.city or "", "country": a.country or ""},
            "created_at": str(a.created_at),
        }
        for a in assessments
    ]


@app.post("/fraud-check")
async def fraud_check_with_ai(
    payload: dict,
    current_user: models.User = Depends(auth.get_current_user)
):
    """Use Gemini AI (REST API) to analyze a transaction description for fraud."""
    import json as _json
    import urllib.request
    import urllib.error
    import time

    text = payload.get("text", "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="No text provided for analysis.")

    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="AI API key not configured.")

    prompt = f"""You are a senior fraud analyst at a top-tier bank with 15 years of experience detecting financial fraud. You have studied thousands of real fraud cases and legitimate transactions.

USER SUBMITTED THIS FOR ANALYSIS:
"{text}"

--- KNOWN FRAUD PATTERNS (from real cases) ---
FAKE/FRAUD indicators:
- "Your account has been compromised, click link to verify" (phishing)
- "Transfer $5000 to secure your account" (social engineering)
- Transactions at 1am-4am from overseas IPs
- Multiple small transactions to same account within minutes (structuring)
- "You won a lottery, send processing fee" (advance fee fraud)
- Sudden large transfers to new/unfamiliar accounts
- Requests to change account details before a large transfer
- "URGENT: Verify account or it will be suspended"
- Card charged at two locations 50+ miles apart within same hour
- Purchase + immediate refund + repurchase pattern (card testing)
- Same amount charged multiple times within 10 mins (duplicate)
- "Your OTP is XXXXX, share it to proceed" (OTP scam — NOTE: banks never ask for OTPs)

GENUINE/SAFE indicators:
- Regular recurring transactions (subscriptions, salary, utility)
- Transactions matching user's spending history
- Bank-initiated OTP to user (banks send OTPs, they never ask you to share them)
- "Your account statement is ready" or "Payment of X processed successfully"
- EMI deductions on fixed schedule
- Payroll or government disbursements
- Small transactions at local familiar merchants
- Transfer to own accounts (savings to current, etc.)

--- STRUCTURED ANALYSIS REQUIRED ---
Analyze the input against these patterns. Consider:
1. Does it match any fraud pattern above?
2. Does it match any genuine pattern above?
3. What signals specifically are present?
4. What is the urgency — should user act NOW or can it wait?
5. What exact action should the user take?

Return ONLY this raw JSON (absolutely no markdown, no code fences):
{{"verdict":"FRAUDULENT|SUSPICIOUS|LEGITIMATE","risk_level":"high|medium|low","confidence":0-100,"is_fraud":true|false,"fraud_signals":["signal1","signal2"],"genuine_signals":["signal1"],"reason":"2-3 sentence professional analysis referencing specific patterns","recommendation":"Exact decisive action the user must take right now","urgency":"IMMEDIATE|WITHIN 24H|MONITOR|NO ACTION"}}"""

    request_body = {
        "contents": [{"parts": [{"text": prompt}]}]
    }

    # Use gemini-1.5-flash — significantly higher free-tier quota (60 RPM vs 2 RPM on 2.5)
    url = f"https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"

    def keyword_fallback(reason_prefix=""):
        tl = text.lower()

        # ── High-confidence fraud signals ──
        high_signals = [
            # OTP / phishing
            "share your otp", "share otp", "send otp", "enter otp", "verify otp",
            "otp is", "your otp", "otp for",
            # Urgency / account threat
            "account will be blocked", "account blocked", "account suspended",
            "account will be deactivated", "click here to verify", "click the link",
            "verify your account", "confirm your details", "update your kyc",
            "your card has been blocked",
            # Prize / lottery scams
            "you have won", "you've won", "winner", "lottery", "prize money",
            "claim your reward", "you are selected",
            # Money mule / social engineering
            "send money", "transfer money", "send funds", "wire transfer",
            "processing fee", "release fee", "advance fee",
            "western union", "moneygram",
            # Fake bank
            "rbi officer", "cybercrime officer", "police officer calling",
            "income tax notice", "court notice",
            # Suspicious patterns
            "unknown sender", "unauthorized transaction", "fraudulent charge",
            "suspicious activity", "from an unknown", "unrecognized device",
            "midnight", "3am", "2am", "4am", "3 am", "2 am",
        ]

        # ── Medium-confidence signals ──
        medium_signals = [
            "unusual", "strange", "not recognized", "not mine", "i didn't do",
            "foreign country", "overseas", "international transfer",
            "new beneficiary", "first time", "hack", "hacked",
            "duplicate charge", "double charge", "charged twice",
            "large amount", "huge transaction",
        ]

        high_hits = [k for k in high_signals if k in tl]
        med_hits = [k for k in medium_signals if k in tl]
        total_hits = len(high_hits) + len(med_hits)

        # Compute verdict
        if len(high_hits) >= 1:
            verdict = "FRAUDULENT"
            risk = "high"
            is_fraud = True
            urgency = "IMMEDIATE"
            confidence = min(60 + len(high_hits) * 10, 90)
            rec = "Do NOT share any OTP, click any links, or transfer money. Call your bank immediately on its official helpline."
        elif total_hits >= 2:
            verdict = "SUSPICIOUS"
            risk = "medium"
            is_fraud = False
            urgency = "WITHIN 24H"
            confidence = min(40 + total_hits * 8, 75)
            rec = "Treat with caution. Verify through your bank's official app or website before taking any action."
        elif total_hits == 1:
            verdict = "SUSPICIOUS"
            risk = "medium"
            is_fraud = False
            urgency = "MONITOR"
            confidence = 35
            rec = "Monitor this transaction and verify with your bank if unsure."
        else:
            verdict = "LEGITIMATE"
            risk = "low"
            is_fraud = False
            urgency = "NO ACTION"
            confidence = 55
            rec = "No obvious fraud indicators found. Continue to monitor your account regularly."

        triggered = high_hits + med_hits
        fraud_signals = [f'Contains "{k}"' for k in triggered[:5]]

        return {
            "verdict": verdict,
            "risk_level": risk,
            "is_fraud": is_fraud,
            "confidence": confidence,
            "fraud_signals": fraud_signals,
            "genuine_signals": [],
            "reason": f"{reason_prefix}Keyword analysis detected {total_hits} risk signal(s): {', '.join(triggered[:3]) or 'none'}. " + (
                "Strong fraud indicators present — treat as high risk." if len(high_hits) >= 1 else
                "Some suspicious patterns found — treat with caution." if total_hits > 0 else
                "No known fraud keywords found in this text."
            ),
            "recommendation": rec,
            "urgency": urgency,
            "ai_powered": False
        }

    def call_gemini():
        req_data = _json.dumps(request_body).encode("utf-8")
        req = urllib.request.Request(
            url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8")

    try:
        try:
            raw = call_gemini()
        except urllib.error.HTTPError as e:
            if e.code == 429:
                # One retry after 2 seconds
                time.sleep(2)
                try:
                    raw = call_gemini()
                except urllib.error.HTTPError as e2:
                    return keyword_fallback(f"Gemini rate limited (HTTP 429). ")
            else:
                return keyword_fallback(f"Gemini API error (HTTP {e.code}). ")

        api_response = _json.loads(raw)
        content = api_response["candidates"][0]["content"]["parts"][0]["text"].strip()

        # Strip markdown if model wraps in code fence
        if "```json" in content:
            content = content.split("```json")[1].split("```")[0].strip()
        elif "```" in content:
            content = content.split("```")[1].split("```")[0].strip()
        # Find first { to handle any leading text
        start = content.find("{")
        if start != -1:
            content = content[start:]

        result = _json.loads(content)
        return {
            "verdict": result.get("verdict", "SUSPICIOUS"),
            "risk_level": result.get("risk_level", "medium"),
            "is_fraud": bool(result.get("is_fraud", False)),
            "confidence": int(result.get("confidence", 50)),
            "fraud_signals": result.get("fraud_signals", []),
            "genuine_signals": result.get("genuine_signals", []),
            "reason": result.get("reason", "Analysis completed."),
            "recommendation": result.get("recommendation", "Monitor this transaction."),
            "urgency": result.get("urgency", "MONITOR"),
            "ai_powered": True
        }

    except Exception as e:
        return keyword_fallback(f"AI parsing error. ")


