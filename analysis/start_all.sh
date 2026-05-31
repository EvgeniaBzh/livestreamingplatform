#!/bin/bash

python3 gemini.py &

echo "!!! STARTING VISION SERVER ONLY FOR DEBUGGING !!!"
python3 vision_server.py