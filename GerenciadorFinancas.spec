# -*- mode: python ; coding: utf-8 -*-

import os
import sys

block_cipher = None

datas = [
    ('frontend/out', 'frontend_out'),
    ('backend/app', 'app'),
    ('backend/app', 'backend/app'),
]

hiddenimports = [
    'uvicorn',
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.asyncio',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.wsproto_impl',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'h11',
    'fastapi',
    'starlette',
    'starlette.routing',
    'starlette.staticfiles',
    'starlette.responses',
    'starlette.middleware',
    'starlette.middleware.cors',
    'sqlalchemy',
    'sqlalchemy.sql.default_comparator',
    'sqlalchemy.dialects.sqlite',
    'sqlite3',
    'pydantic',
    'pydantic_settings',
    'dotenv',
    'requests',
    'app',
    'app.main',
    'app.models',
    'app.schemas',
    'app.database',
    'app.services',
    'app.services.pluggy_client',
    'tkinter',
    'tkinter.ttk',
    'tkinter.messagebox',
]

a = Analysis(
    ['run_desktop.py'],
    pathex=['.', 'backend', 'backend/app'],
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['matplotlib', 'pandas', 'scipy', 'pytest'],
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
