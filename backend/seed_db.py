from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app import models, auth
import datetime

def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    # Check if user exists
    user = db.query(models.User).filter(models.User.email == "test@example.com").first()
    if not user:
        hashed_pw = auth.get_password_hash("password123")
        user = models.User(name="Test User", email="test@example.com", hashed_password=hashed_pw)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user: {user.email}")
    
    # Add some transactions
    if not db.query(models.Transaction).filter(models.Transaction.user_id == user.id).first():
        transactions = [
            models.Transaction(description="Grocery Store", amount=-45.50, category="Food", date=datetime.date.today(), user_id=user.id),
            models.Transaction(description="Salary Deposit", amount=5000.00, category="Income", date=datetime.date.today(), user_id=user.id),
            models.Transaction(description="Netflix Subscription", amount=-15.99, category="Entertainment", date=datetime.date.today(), user_id=user.id),
            models.Transaction(description="Electric Bill", amount=-120.00, category="Utilities", date=datetime.date.today(), user_id=user.id),
        ]
        db.add_all(transactions)
        print("Added sample transactions")
    
    # Add some investments
    if not db.query(models.Investment).filter(models.Investment.user_id == user.id).first():
        investments = [
            models.Investment(asset_name="S&P 500 Index", amount_invested=5000.0, current_value=5250.0, user_id=user.id),
            models.Investment(asset_name="Bitcoin", amount_invested=2000.0, current_value=2400.0, user_id=user.id),
        ]
        db.add_all(investments)
        print("Added sample investments")
        
    db.commit()
    db.close()

if __name__ == "__main__":
    seed()
