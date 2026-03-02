from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    transactions = relationship("Transaction", back_populates="owner")
    investments = relationship("Investment", back_populates="owner")

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float)
    category = Column(String)
    description = Column(String)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    is_fraudulent = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="transactions")

class Investment(Base):
    __tablename__ = "investments"

    id = Column(Integer, primary_key=True, index=True)
    asset_name = Column(String)
    amount_invested = Column(Float)
    current_value = Column(Float)
    purchase_date = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="investments")

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text)
    response = Column(Text)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

class FraudAlert(Base):
    __tablename__ = "fraud_alerts"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String)
    description = Column(String)
    amount = Column(Float)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    risk = Column(String) # low, medium, high
    status = Column(String) # flagged, verified, safe
    user_id = Column(Integer, ForeignKey("users.id"))

class RiskAssessment(Base):
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, index=True)
    transaction_description = Column(String)
    transaction_amount = Column(Float)
    risk_score = Column(Integer)
    risk_level = Column(String)   # Safe | Suspicious | High Risk
    final_action = Column(String) # Approve | Require OTP | Block
    reasons = Column(Text)        # JSON string list
    ip_address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    country = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

