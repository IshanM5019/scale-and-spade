import asyncio
import asyncpg
import sys

async def main():
    try:
        with open('supabase/migrations/20240318000000_initial_schema.sql', 'r') as f:
            sql = f.read()
    except FileNotFoundError:
        print("SQL file not found!")
        sys.exit(1)

    print("Connecting to Supabase DB...")
    # Connecting to standard postgres port 5432
    try:
        conn = await asyncpg.connect("postgresql://postgres.yozjqtrtccdrjttcxegt:proishan123123@aws-0-ap-south-1.pooler.supabase.com:6543/postgres")
        
        # Alternatively using the direct connection if pooler doesn't work:
        # conn = await asyncpg.connect("postgresql://postgres:proishan123123@db.yozjqtrtccdrjttcxegt.supabase.co:5432/postgres")
        
        print("Connected successfully. Executing migration...")
        await conn.execute(sql)
        print("Migration applied successfully!")
        await conn.close()
    except Exception as e:
        print(f"Failed via pooler. Trying direct connection... ({e})")
        conn = await asyncpg.connect("postgresql://postgres:proishan123123@db.yozjqtrtccdrjttcxegt.supabase.co:5432/postgres")
        print("Connected successfully. Executing migration...")
        await conn.execute(sql)
        print("Migration applied successfully!")
        await conn.close()

asyncio.run(main())
