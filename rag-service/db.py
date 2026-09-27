"""
Live MySQL data access for the SharePlate RAG service.

Connects directly to the existing `ecorescue_db` MySQL database (the same
database the Express backend uses) and reads posts and user rows.

This module never returns password/credential fields, and never sends
database credentials anywhere except to MySQL itself.
"""

import os
import pymysql
import pymysql.cursors


class DatabaseUnavailableError(Exception):
    """Raised whenever SharePlate's live MySQL data cannot be read."""
    pass


def _get_connection():
    host = os.getenv("DB_HOST", "localhost")
    port_str = os.getenv("DB_PORT", "3306")
    database = os.getenv("DB_NAME", "ecorescue_db")

    try:
        port = int(port_str)
    except ValueError:
        port = 3306

    try:
        return pymysql.connect(
            host=host,
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            port=port,
            database=database,
            cursorclass=pymysql.cursors.DictCursor,
            connect_timeout=5,
        )
    except Exception as exc:
        # Never print the password. Host/port/database name are not secrets.
        print(
            "[RAG] Could not connect to MySQL.\n"
            f"  Host: {host}\n"
            f"  Port: {port}\n"
            f"  Database: {database}\n"
            f"  Error: {type(exc).__name__}: {exc}"
        )
        raise DatabaseUnavailableError("Could not read SharePlate MySQL data.") from exc


def fetch_posts(limit: int = 50) -> list:
    """
    Fetch recent posts from the `posts` table.

    Returns a list of dicts with: id, restaurantId, restaurantName, foodType,
    quantity, pickupDeadline, instructions, status, claimedByNgoId, createdAt.
    restaurantId / claimedByNgoId are only used internally for filtering and
    should not be forwarded to the LLM as-is.
    """
    conn = _get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT id, restaurantId, restaurantName, foodType, quantity,
                       pickupDeadline, instructions, status, claimedByNgoId, createdAt
                FROM posts
                ORDER BY createdAt DESC
                LIMIT %s
                """,
                (limit,),
            )
            return cursor.fetchall()
    except DatabaseUnavailableError:
        raise
    except Exception as exc:
        print(f"[RAG] Error querying the posts table: {type(exc).__name__}: {exc}")
        raise DatabaseUnavailableError("Could not read SharePlate MySQL data.") from exc
    finally:
        conn.close()


def fetch_user_by_uid(uid: str):
    """
    Fetch a single user's non-sensitive profile/stats by uid.

    Never selects the password column. Returns None if no such user exists.
    """
    if not uid:
        return None

    conn = _get_connection()
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT uid, name, role,
                       stats_totalDonations, stats_reliabilityScore, stats_pickupsCompleted
                FROM users
                WHERE uid = %s
                """,
                (uid,),
            )
            return cursor.fetchone()
    except DatabaseUnavailableError:
        raise
    except Exception as exc:
        print(f"[RAG] Error querying the users table: {type(exc).__name__}: {exc}")
        raise DatabaseUnavailableError("Could not read SharePlate MySQL data.") from exc
    finally:
        conn.close()
