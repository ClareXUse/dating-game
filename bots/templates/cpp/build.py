"""Build before the game clock starts. Requires g++ with C++17 support."""
from pathlib import Path
import subprocess
import sys
here = Path(__file__).resolve().parent
subprocess.run(['g++','-std=c++17','-O2',str(here/'strategy.cpp'),'-o',
                str(here/('strategy.exe' if sys.platform=='win32' else 'strategy'))],check=True)
