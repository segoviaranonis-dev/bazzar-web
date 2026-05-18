#!/usr/bin/env python
"""OT-2026-048: Verificar columna genero en v_stock_web"""
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres.extrlcvcgypwazxipvqm:IJoFJbT8Qj0Q0w5m@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
engine = create_engine(db_url)

print('='*80)
print('OT-2026-048: VERIFICANDO COLUMNA GENERO EN v_stock_web')
print('='*80)

with engine.connect() as conn:
    # Ver columnas de v_stock_web
    result = conn.execute(text("""
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'v_stock_web'
        ORDER BY ordinal_position
    """))

    print('\n[COLUMNAS EN v_stock_web]')
    print('-'*80)
    columnas = []
    for row in result:
        columnas.append(row[0])
        print(f'  {row[0]:30} {row[1]}')

    # Verificar si existe genero
    tiene_genero = 'genero' in columnas
    print('\n' + '='*80)
    if tiene_genero:
        print('[OK] Columna GENERO existe en v_stock_web')

        # Query de ejemplo
        result2 = conn.execute(text("""
            SELECT DISTINCT genero, COUNT(*) as total
            FROM v_stock_web
            WHERE stock_web > 0 AND genero IS NOT NULL
            GROUP BY genero
            ORDER BY genero
        """))

        print('\n[GENEROS CON STOCK]')
        print('-'*80)
        for row in result2:
            print(f'  {row[0]:20} {row[1]:6} productos')
    else:
        print('[!] Columna GENERO NO existe en v_stock_web')
        print('    Necesita agregarse a la vista o usar JOIN con tabla linea')

print('='*80)
