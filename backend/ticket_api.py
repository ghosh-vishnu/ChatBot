from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from ticket_database import ticket_db

router = APIRouter()

class TicketCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    user_query: str
    phone: Optional[str] = None

class TicketResponse(BaseModel):
    token: str
    first_name: str
    last_name: str
    email: str
    user_query: str
    status: str
    created_at: str

@router.post("/tickets/create", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_ticket(ticket_data: TicketCreate):
    """Create a new support ticket"""
    try:
        new_ticket = ticket_db.create_ticket(
            first_name=ticket_data.first_name,
            last_name=ticket_data.last_name,
            email=ticket_data.email,
            user_query=ticket_data.user_query,
            phone=ticket_data.phone
        )
        return {
            "success": True,
            "message": "Ticket created successfully!",
            "ticket": {
                "token": new_ticket["token"],
                "first_name": new_ticket["first_name"],
                "last_name": new_ticket["last_name"],
                "email": new_ticket["email"],
                "user_query": new_ticket["user_query"],
                "status": new_ticket["status"],
                "created_at": new_ticket["created_at"]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create ticket: {str(e)}")

@router.get("/tickets/{token}", response_model=Dict[str, Any])
async def get_ticket(token: str):
    """Get ticket details by token"""
    try:
        ticket = ticket_db.get_ticket_by_token(token)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        # Get responses for this ticket
        responses = ticket_db.get_ticket_responses(token)
        
        return {
            "success": True,
            "ticket": ticket,
            "responses": responses
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve ticket: {str(e)}")

@router.get("/tickets", response_model=List[Dict[str, Any]])
async def get_all_tickets():
    """Get all tickets (for admin)"""
    try:
        tickets = ticket_db.get_all_tickets()
        return tickets
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve tickets: {str(e)}")

class TicketStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None

@router.put("/tickets/{token}/status", response_model=Dict[str, Any])
async def update_ticket_status(token: str, update_data: TicketStatusUpdate):
    """Update ticket status (for admin)"""
    try:
        success = ticket_db.update_ticket_status(token, update_data.status, update_data.admin_notes)
        if not success:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return {
            "success": True,
            "message": "Ticket status updated successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update ticket: {str(e)}")

@router.post("/tickets/{token}/respond", response_model=Dict[str, Any])
async def respond_to_ticket(token: str, response_text: str, response_by: str = "admin"):
    """Add response to ticket"""
    try:
        # Check if ticket exists
        ticket = ticket_db.get_ticket_by_token(token)
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        success = ticket_db.add_ticket_response(token, response_text, response_by)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add response")
        
        return {
            "success": True,
            "message": "Response added successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add response: {str(e)}")

@router.delete("/tickets/{token}", response_model=Dict[str, Any])
async def delete_ticket(token: str):
    """Delete a ticket (for admin)"""
    try:
        success = ticket_db.delete_ticket(token)
        if not success:
            raise HTTPException(status_code=404, detail="Ticket not found")
        
        return {
            "success": True,
            "message": "Ticket deleted successfully"
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete ticket: {str(e)}")
