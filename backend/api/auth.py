from fastapi import Header, HTTPException
from typing import Annotated


async def get_current_user(authorization: Annotated[str | None, Header()] = None) -> str:
    """
    Middleware de autenticación básico.

    Verifica que el request incluya el header Authorization.
    Devuelve el token crudo para que capas superiores puedan
    validarlo contra Supabase Auth cuando se implemente la
    verificación completa de JWT.

    Raises:
        HTTPException 401: si el header está ausente o vacío.
    """
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="No autenticado. Se requiere el header Authorization.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return authorization
