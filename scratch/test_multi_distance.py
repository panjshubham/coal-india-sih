from PIL import Image, ImageDraw
import sys, asyncio, json
sys.path.append('backend/ai-service')
from main import ppe_detect
from fastapi import UploadFile
import io

# Create Multi-person and distance test image
img_multi = Image.new('RGB', (800, 600), color=(180, 180, 185))
draw = ImageDraw.Draw(img_multi)

# Person 1 (Foreground worker, fully compliant)
# Yellow Helmet
draw.ellipse([100, 80, 200, 150], fill=(250, 215, 10))
draw.rectangle([95, 135, 205, 155], fill=(240, 195, 5))
# Face
draw.ellipse([120, 150, 180, 200], fill=(195, 140, 105))
# Hi-Vis Lime-Yellow Vest
draw.rectangle([80, 210, 220, 420], fill=(205, 250, 15))
draw.rectangle([80, 290, 220, 310], fill=(235, 240, 245))
draw.rectangle([90, 420, 140, 580], fill=(35, 35, 45))
draw.rectangle([160, 420, 210, 580], fill=(35, 35, 45))

# Person 2 (Distant background worker, non-compliant, tiny silhouette)
draw.ellipse([550, 250, 580, 280], fill=(40, 30, 20)) # hair
draw.ellipse([555, 270, 575, 290], fill=(190, 135, 100)) # face
draw.rectangle([545, 290, 585, 370], fill=(50, 50, 65)) # dark civilian clothes
draw.rectangle([550, 370, 565, 440], fill=(30, 30, 35))
draw.rectangle([568, 370, 583, 440], fill=(30, 30, 35))

img_multi.save('scratch/test_multi_distance.jpg')

async def run():
    with open('scratch/test_multi_distance.jpg', 'rb') as f:
        data = f.read()
    file = UploadFile(filename='test_multi_distance.jpg', file=io.BytesIO(data))
    res = await ppe_detect(file)
    print('=== Multi-Person / Distance Test ===')
    print('Status:', res['compliance_status'])
    print('Coverage:', res['coverage_metrics'])
    print('Detections:', json.dumps(res['detected_items'], indent=2))

if __name__ == '__main__':
    asyncio.run(run())
