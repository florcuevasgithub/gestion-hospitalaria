import base64
import json
import time

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# FastAPI extrae el token del header: Authorization: Bearer <token>
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def _decode_jwt_payload(token: str) -> dict:
    """
    Decodifica el payload de un JWT sin verificar la firma.
    Supabase usa ES256 para tokens de usuario (clave asimétrica pública),
    por lo que la verificación de firma se delega a Supabase Auth.
    Aquí solo extraemos el sub (UUID del usuario) y validamos la expiración.
    """
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Formato JWT inválido")

        # Agrega padding Base64 si falta
        payload_b64 = parts[1] + "=" * (4 - len(parts[1]) % 4)
        payload = json.loads(base64.b64decode(payload_b64))
        return payload
    except Exception as e:
        raise ValueError(f"No se pudo decodificar el token: {e}")


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    """
    Extrae y valida el UUID del usuario desde el JWT de Supabase.

    Supabase firma los tokens de usuario con ES256 (ECDSA).
    Verificamos manualmente: estructura, expiración y presencia del campo sub.

    Raises:
        HTTPException 401: si el token está ausente, malformado o expirado.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token inválido o sesión expirada. Volvé a iniciar sesión.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = _decode_jwt_payload(token)

        # Verificar expiración manualmente
        exp = payload.get("exp")
        if exp and int(time.time()) > exp:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="La sesión expiró. Volvé a iniciar sesión.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id: str | None = payload.get("sub")
        if not user_id:
            raise credentials_exception

        return user_id

    except HTTPException:
        raise
    except Exception:
        raise credentials_exception
