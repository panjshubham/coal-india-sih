import sys, asyncio, json
sys.path.append('backend/ai-service')
from main import ppe_detect
from fastapi import UploadFile
import io

async def test_endpoint():
    cases = [
        ('scratch/test_no_ppe.jpg', 'Case 1: No PPE (Civilian Clothes)'),
        ('scratch/test_helmet_only.jpg', 'Case 2: Helmet Only'),
        ('scratch/test_vest_only.jpg', 'Case 3: Vest Only'),
        ('scratch/test_compliant.jpg', 'Case 4: Full PPE Compliant (Helmet + Vest)'),
        ('scratch/test_borderline.jpg', 'Case 5: Borderline / Low Lighting')
    ]
    for path, name in cases:
        with open(path, 'rb') as f:
            data = f.read()
        file = UploadFile(filename=path, file=io.BytesIO(data))
        res = await ppe_detect(file)
        print(f'=== {name} ===')
        print('Status:', res['compliance_status'], '| Severity:', res['severity'])
        print('Coverage:', res['coverage_metrics'])
        print('Missing:', res['missing_ppe'], '| Borderline:', res['borderline_ppe'])
        print('Detections:', json.dumps(res['detected_items']))

if __name__ == '__main__':
    asyncio.run(test_endpoint())
