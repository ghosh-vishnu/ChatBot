from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import List, Optional
import sqlite3
from auth_router import verify_token

router = APIRouter(prefix="/admin/chat")
security = HTTPBearer()

# Pydantic Models
class ChatCategoryCreate(BaseModel):
    name: str
    description: str

class ChatCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ChatCategoryResponse(BaseModel):
    id: int
    name: str
    description: str
    is_active: bool

class ChatSubcategoryCreate(BaseModel):
    category_id: int
    name: str
    description: str

class ChatSubcategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class ChatSubcategoryResponse(BaseModel):
    id: int
    category_id: int
    name: str
    description: str
    is_active: bool

def get_db_connection():
    """Get database connection"""
    conn = sqlite3.connect('venturing.db')
    conn.row_factory = sqlite3.Row
    return conn

@router.get("/categories", response_model=List[ChatCategoryResponse])
async def get_chat_categories(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all chat categories for admin management"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, name, description, is_active 
        FROM chat_categories 
        ORDER BY name
    """)
    
    categories = []
    for row in cursor.fetchall():
        categories.append(ChatCategoryResponse(
            id=row["id"],
            name=row["name"],
            description=row["description"],
            is_active=bool(row["is_active"])
        ))
    
    conn.close()
    return categories

@router.post("/categories", response_model=ChatCategoryResponse)
async def create_chat_category(
    category: ChatCategoryCreate, 
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new chat category"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if category name already exists
    cursor.execute("SELECT id FROM chat_categories WHERE name = ?", (category.name,))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Category name already exists")
    
    # Insert new category
    cursor.execute("""
        INSERT INTO chat_categories (name, description, is_active)
        VALUES (?, ?, 1)
    """, (category.name, category.description))
    
    category_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return ChatCategoryResponse(
        id=category_id,
        name=category.name,
        description=category.description,
        is_active=True
    )

@router.put("/categories/{category_id}", response_model=ChatCategoryResponse)
async def update_chat_category(
    category_id: int,
    category: ChatCategoryUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a chat category"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if category exists
    cursor.execute("SELECT * FROM chat_categories WHERE id = ?", (category_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if new name conflicts with existing categories
    if category.name:
        cursor.execute("SELECT id FROM chat_categories WHERE name = ? AND id != ?", (category.name, category_id))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Category name already exists")
    
    # Build update query dynamically
    update_fields = []
    values = []
    
    if category.name is not None:
        update_fields.append("name = ?")
        values.append(category.name)
    
    if category.description is not None:
        update_fields.append("description = ?")
        values.append(category.description)
    
    if category.is_active is not None:
        update_fields.append("is_active = ?")
        values.append(1 if category.is_active else 0)
    
    if not update_fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update")
    
    values.append(category_id)
    
    cursor.execute(f"""
        UPDATE chat_categories 
        SET {', '.join(update_fields)}
        WHERE id = ?
    """, values)
    
    conn.commit()
    
    # Fetch updated category
    cursor.execute("SELECT * FROM chat_categories WHERE id = ?", (category_id,))
    updated = cursor.fetchone()
    
    conn.close()
    
    return ChatCategoryResponse(
        id=updated["id"],
        name=updated["name"],
        description=updated["description"],
        is_active=bool(updated["is_active"])
    )

@router.delete("/categories/{category_id}")
async def delete_chat_category(
    category_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a chat category (soft delete)"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if category exists
    cursor.execute("SELECT * FROM chat_categories WHERE id = ?", (category_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Category not found")
    
    # Check if category is being used in any chat requests
    cursor.execute("SELECT COUNT(*) FROM chat_requests WHERE category_id = ?", (category_id,))
    usage_count = cursor.fetchone()[0]
    
    if usage_count > 0:
        # Soft delete - just deactivate
        cursor.execute("UPDATE chat_categories SET is_active = 0 WHERE id = ?", (category_id,))
        conn.commit()
        conn.close()
        return {"message": "Category deactivated successfully (soft delete)"}
    else:
        # Hard delete - remove completely
        cursor.execute("DELETE FROM chat_categories WHERE id = ?", (category_id,))
        conn.commit()
        conn.close()
        return {"message": "Category deleted successfully"}

@router.get("/categories/stats")
async def get_chat_categories_stats(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get statistics for chat categories"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get total categories
    cursor.execute("SELECT COUNT(*) FROM chat_categories")
    total_categories = cursor.fetchone()[0]
    
    # Get active categories
    cursor.execute("SELECT COUNT(*) FROM chat_categories WHERE is_active = 1")
    active_categories = cursor.fetchone()[0]
    
    # Get category usage stats
    cursor.execute("""
        SELECT cc.name, COUNT(cr.id) as usage_count
        FROM chat_categories cc
        LEFT JOIN chat_requests cr ON cc.id = cr.category_id
        WHERE cc.is_active = 1
        GROUP BY cc.id, cc.name
        ORDER BY usage_count DESC
    """)
    
    usage_stats = []
    for row in cursor.fetchall():
        usage_stats.append({
            "name": row["name"],
            "usage_count": row["usage_count"]
        })
    
    conn.close()
    
    return {
        "total_categories": total_categories,
        "active_categories": active_categories,
        "inactive_categories": total_categories - active_categories,
        "usage_stats": usage_stats
    }

# Subcategories endpoints
@router.get("/subcategories", response_model=List[ChatSubcategoryResponse])
async def get_chat_subcategories(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get all chat subcategories for admin management"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT s.id, s.category_id, s.name, s.description, s.is_active, c.name as category_name
        FROM chat_subcategories s
        JOIN chat_categories c ON s.category_id = c.id
        ORDER BY c.name, s.name
    """)
    
    subcategories = []
    for row in cursor.fetchall():
        subcategories.append(ChatSubcategoryResponse(
            id=row["id"],
            category_id=row["category_id"],
            name=row["name"],
            description=row["description"],
            is_active=bool(row["is_active"])
        ))
    
    conn.close()
    return subcategories

@router.get("/subcategories/{category_id}", response_model=List[ChatSubcategoryResponse])
async def get_subcategories_by_category(category_id: int, credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get subcategories for a specific category"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, category_id, name, description, is_active
        FROM chat_subcategories 
        WHERE category_id = ? AND is_active = 1
        ORDER BY name
    """, (category_id,))
    
    subcategories = []
    for row in cursor.fetchall():
        subcategories.append(ChatSubcategoryResponse(
            id=row["id"],
            category_id=row["category_id"],
            name=row["name"],
            description=row["description"],
            is_active=bool(row["is_active"])
        ))
    
    conn.close()
    return subcategories

@router.post("/subcategories", response_model=ChatSubcategoryResponse)
async def create_chat_subcategory(
    subcategory: ChatSubcategoryCreate, 
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Create a new chat subcategory"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if category exists
    cursor.execute("SELECT id FROM chat_categories WHERE id = ?", (subcategory.category_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Category not found")
    
    # Check if subcategory name already exists for this category
    cursor.execute("SELECT id FROM chat_subcategories WHERE name = ? AND category_id = ?", 
                   (subcategory.name, subcategory.category_id))
    if cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=400, detail="Subcategory name already exists for this category")
    
    # Insert new subcategory
    cursor.execute("""
        INSERT INTO chat_subcategories (category_id, name, description, is_active)
        VALUES (?, ?, ?, 1)
    """, (subcategory.category_id, subcategory.name, subcategory.description))
    
    subcategory_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return ChatSubcategoryResponse(
        id=subcategory_id,
        category_id=subcategory.category_id,
        name=subcategory.name,
        description=subcategory.description,
        is_active=True
    )

@router.put("/subcategories/{subcategory_id}", response_model=ChatSubcategoryResponse)
async def update_chat_subcategory(
    subcategory_id: int,
    subcategory: ChatSubcategoryUpdate,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Update a chat subcategory"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if subcategory exists
    cursor.execute("SELECT * FROM chat_subcategories WHERE id = ?", (subcategory_id,))
    existing = cursor.fetchone()
    if not existing:
        conn.close()
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    # Check if new name conflicts with existing subcategories in the same category
    if subcategory.name:
        cursor.execute("SELECT id FROM chat_subcategories WHERE name = ? AND category_id = ? AND id != ?", 
                       (subcategory.name, existing["category_id"], subcategory_id))
        if cursor.fetchone():
            conn.close()
            raise HTTPException(status_code=400, detail="Subcategory name already exists for this category")
    
    # Build update query dynamically
    update_fields = []
    values = []
    
    if subcategory.name is not None:
        update_fields.append("name = ?")
        values.append(subcategory.name)
    
    if subcategory.description is not None:
        update_fields.append("description = ?")
        values.append(subcategory.description)
    
    if subcategory.is_active is not None:
        update_fields.append("is_active = ?")
        values.append(1 if subcategory.is_active else 0)
    
    if not update_fields:
        conn.close()
        raise HTTPException(status_code=400, detail="No fields to update")
    
    values.append(subcategory_id)
    
    cursor.execute(f"""
        UPDATE chat_subcategories 
        SET {', '.join(update_fields)}
        WHERE id = ?
    """, values)
    
    conn.commit()
    
    # Fetch updated subcategory
    cursor.execute("SELECT * FROM chat_subcategories WHERE id = ?", (subcategory_id,))
    updated = cursor.fetchone()
    
    conn.close()
    
    return ChatSubcategoryResponse(
        id=updated["id"],
        category_id=updated["category_id"],
        name=updated["name"],
        description=updated["description"],
        is_active=bool(updated["is_active"])
    )

@router.delete("/subcategories/{subcategory_id}")
async def delete_chat_subcategory(
    subcategory_id: int,
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Delete a chat subcategory (soft delete)"""
    # Verify admin token
    user_response = await verify_token(credentials)
    user = user_response["user"]
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if subcategory exists
    cursor.execute("SELECT * FROM chat_subcategories WHERE id = ?", (subcategory_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Subcategory not found")
    
    # Check if subcategory is being used in any chat requests
    cursor.execute("SELECT COUNT(*) FROM chat_requests WHERE subcategory_id = ?", (subcategory_id,))
    usage_count = cursor.fetchone()[0]
    
    if usage_count > 0:
        # Soft delete - just deactivate
        cursor.execute("UPDATE chat_subcategories SET is_active = 0 WHERE id = ?", (subcategory_id,))
        conn.commit()
        conn.close()
        return {"message": "Subcategory deactivated successfully (soft delete)"}
    else:
        # Hard delete - remove completely
        cursor.execute("DELETE FROM chat_subcategories WHERE id = ?", (subcategory_id,))
        conn.commit()
        conn.close()
        return {"message": "Subcategory deleted successfully"}
