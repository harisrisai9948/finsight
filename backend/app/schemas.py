from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Transaction Schemas
class TransactionBase(BaseModel):
    amount: float
    category: str
    description: str

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    date: datetime
    is_fraudulent: bool
    user_id: int

    class Config:
        from_attributes = True

# Investment Schemas
class InvestmentBase(BaseModel):
    asset_name: str
    amount_invested: float
    current_value: float

class InvestmentCreate(InvestmentBase):
    pass

class Investment(InvestmentBase):
    id: int
    purchase_date: datetime
    user_id: int

    class Config:
        from_attributes = True

# Fraud Alert Schemas
class FraudAlertBase(BaseModel):
    type: str
    description: str
    amount: float
    risk: str
    status: str

class FraudAlertCreate(FraudAlertBase):
    pass

class FraudAlert(FraudAlertBase):
    id: int
    date: datetime
    user_id: int

    class Config:
        from_attributes = True

# Chat Schemas
class ChatRequest(BaseModel):
    message: str

from typing import List, Optional, Dict, Any

class ChatResponse(BaseModel):
    response: str
    options: Optional[List[str]] = None
    data: Optional[Dict[str, Any]] = None

# Risk Assessment Schemas
class RiskAssessmentRequest(BaseModel):
    transaction_description: str
    transaction_amount: float
    is_new_device: bool = False
    ip_address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    beneficiary_added_hours_ago: Optional[float] = None  # hours since beneficiary was added
    failed_otp_attempts: int = 0
    transaction_hour: int = 12  # 0-23

class RiskAssessmentOut(BaseModel):
    id: int
    risk_score: int
    risk_level: str
    final_action: str
    reasons: List[str]
    origin: Dict[str, str]
    created_at: datetime

    class Config:
        from_attributes = True

