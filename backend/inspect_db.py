import sqlite3
import pandas as pd
from tabulate import tabulate

def inspect_db():
    try:
        conn = sqlite3.connect('techsiri.db')
        cursor = conn.cursor()
        
        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print("\n=== TechSiri Database Inspection ===\n")
        
        for table_name in tables:
            table_name = table_name[0]
            if table_name == 'sqlite_sequence':
                continue
                
            print(f"\nTable: {table_name}")
            try:
                df = pd.read_sql_query(f"SELECT * FROM {table_name}", conn)
                if df.empty:
                    print(" (Empty)")
                else:
                    print(tabulate(df, headers='keys', tablefmt='psql', showindex=False))
            except Exception as e:
                print(f" Error reading table {table_name}: {e}")
        
        conn.close()
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    inspect_db()
