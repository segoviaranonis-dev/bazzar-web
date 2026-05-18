#!/usr/bin/env python
"""OT-2026-046: Verificar estilos con stock dinámico"""
from sqlalchemy import create_engine, text

db_url = 'postgresql://postgres.extrlcvcgypwazxipvqm:IJoFJbT8Qj0Q0w5m@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
engine = create_engine(db_url)

with engine.connect() as conn:
    result = conn.execute(text('''
        SELECT DISTINCT estilo, estilo_id, COUNT(*) as productos_con_stock
        FROM v_stock_web
        WHERE stock_web > 0 AND estilo IS NOT NULL
        GROUP BY estilo, estilo_id
        ORDER BY estilo
    '''))

    print('='*70)
    print('OT-2026-046: ESTILOS CON STOCK EN v_stock_web')
    print('='*70)
    for row in result:
        estilo_id_str = str(row[1]) if row[1] is not None else 'NULL'
        print(f'{row[0]:25} | estilo_id: {estilo_id_str:4} | {row[2]:4} productos')
    print('='*70)

    total = conn.execute(text('''
        SELECT COUNT(DISTINCT estilo)
        FROM v_stock_web
        WHERE stock_web > 0 AND estilo IS NOT NULL
    ''')).scalar()
    print(f'Total estilos con stock: {total}')
