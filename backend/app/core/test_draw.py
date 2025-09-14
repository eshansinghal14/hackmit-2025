from annotations import process_claude_annotations

test_data = {
    "annotations": [
        {"type": "latex", "content": "E = mc^2", "x": 200, "y": 150},
        {"type": "circle", "x": 300, "y": 200, "radius": 50}
    ]
}
process_claude_annotations(test_data)
