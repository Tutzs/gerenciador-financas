# -*- mode: python ; coding: utf-8 -*-

import os
import sys

block_cipher = None

datas = [
    ('frontend/out', 'frontend_out'),
    ('backend/app', 'backend/app'),
]

hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'fastapi',
    'starlette',
    'starlette.routing',
    'starlette.staticfiles',
    'starlette.responses',
    'sqlalchemy',
    'sqlalchemy.sql.default_comparator',
    'sqlalchemy.dialects.sqlite',
    'sqlite3',
    'pydantic',
    'dotenv',
    'requests',
    'app.main',
    'app.models',
    'app.schemas',
    'app.database',
    'app.pluggy_client',
]

a = Analysis(
    ['run_desktop.py'],
    pathex=['.', 'backend'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'matplotlib', 'numpy', 'pandas', 'scipy', 'pytest'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='GerenciadorFinancas',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

