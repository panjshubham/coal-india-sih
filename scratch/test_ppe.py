import io, os
import numpy as np
from PIL import Image

def analyze_ppe(img_path: str):
    with open(img_path, 'rb') as f:
        img_bytes = f.read()
    img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    img_resized = img.resize((320, 480))
    arr = np.array(img_resized, dtype=float)
    h, w, _ = arr.shape

    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    is_bg = ((r < 30) & (g < 30) & (b < 30)) | ((r > 235) & (g > 235) & (b > 235)) | ((np.abs(r - g) < 8) & (np.abs(g - b) < 8) & (np.abs(r - b) < 8) & (r > 190))
    fg = ~is_bg
    fg_pixels = int(np.sum(fg))

    fg_y, fg_x = np.where(fg)
    if len(fg_y) == 0 or fg_pixels < (w * h * 0.02):
        return {'status': 'NO_PERSON', 'confidence': 0.0, 'helmet_coverage_pct': 0.0, 'vest_coverage_pct': 0.0, 'detections': []}

    p_ymin, p_ymax = int(np.min(fg_y)), int(np.max(fg_y))
    p_xmin, p_xmax = int(np.min(fg_x)), int(np.max(fg_x))
    person_h = p_ymax - p_ymin
    person_w = p_xmax - p_xmin

    head_y1, head_y2 = p_ymin, min(h - 1, p_ymin + int(person_h * 0.18))
    torso_y1, torso_y2 = head_y2, min(h - 1, p_ymin + int(person_h * 0.62))

    head_mask = fg[head_y1:head_y2, p_xmin:p_xmax]
    head_area = max(int(np.sum(head_mask)), 1)
    hr, hg, hb = r[head_y1:head_y2, p_xmin:p_xmax], g[head_y1:head_y2, p_xmin:p_xmax], b[head_y1:head_y2, p_xmin:p_xmax]

    yellow_helm = head_mask & (hr > 170) & (hg > 150) & (hb < 90) & (hg - hb > 70) & (np.abs(hr - hg) < 45)
    orange_helm = head_mask & (hr > 175) & (hg > 60) & (hg < 155) & (hb < 75) & (hr - hb > 95) & (hr - hg > 30)
    red_helm = head_mask & (hr > 150) & (hg < 90) & (hb < 90) & (hr - np.maximum(hg, hb) > 50)
    white_helm = head_mask & (hr > 225) & (hg > 225) & (hb > 225) & (np.maximum(np.maximum(hr, hg), hb) - np.minimum(np.minimum(hr, hg), hb) < 15)
    blue_helm = head_mask & (hb > 130) & (hb > hr * 1.3) & (hb > hg * 1.2) & (hb - hr > 35)
    helm_pixels = int(np.sum(yellow_helm | orange_helm | red_helm | white_helm | blue_helm))
    helmet_pct = round((helm_pixels / head_area) * 100, 1)

    torso_mask = fg[torso_y1:torso_y2, p_xmin:p_xmax]
    torso_area = max(int(np.sum(torso_mask)), 1)
    tr, tg, tb = r[torso_y1:torso_y2, p_xmin:p_xmax], g[torso_y1:torso_y2, p_xmin:p_xmax], b[torso_y1:torso_y2, p_xmin:p_xmax]

    hi_vis_orange = torso_mask & (tr > 160) & (tg > 55) & (tg < 155) & (tb < 75) & (tr - tg > 30) & (tr - tb > 85)
    hi_vis_lime = torso_mask & (tg > 140) & (tr > 110) & (tb < 85) & (tg - tb > 55) & (tr - tb > 25)
    silver_stripes = torso_mask & (tr > 200) & (tg > 200) & (tb > 200) & (np.maximum(np.maximum(tr, tg), tb) - np.minimum(np.minimum(tr, tg), tb) < 25)
    vest_pixels = int(np.sum(hi_vis_orange | hi_vis_lime | silver_stripes))
    vest_pct = round((vest_pixels / torso_area) * 100, 1)

    has_helmet = helmet_pct >= 12.0
    has_vest = vest_pct >= 15.0
    uncertain_helmet = (not has_helmet) and (helmet_pct >= 4.0)
    uncertain_vest = (not has_vest) and (vest_pct >= 5.0)
    uncertain = uncertain_helmet or uncertain_vest

    detections = []
    detections.append({'label': 'person', 'score': 0.97, 'box': {'xmin': round(p_xmin/w, 3), 'ymin': round(p_ymin/h, 3), 'xmax': round(p_xmax/w, 3), 'ymax': round(p_ymax/h, 3)}})

    if has_helmet:
        detections.append({'label': 'hard-hat', 'score': round(min(0.98, 0.60 + helmet_pct/200.0), 3), 'coverage_pct': helmet_pct})
    elif uncertain_helmet:
        detections.append({'label': 'hard-hat (borderline)', 'score': round(0.40 + helmet_pct/100.0, 3), 'coverage_pct': helmet_pct})

    if has_vest:
        detections.append({'label': 'safety-vest', 'score': round(min(0.98, 0.60 + vest_pct/200.0), 3), 'coverage_pct': vest_pct})
    elif uncertain_vest:
        detections.append({'label': 'safety-vest (borderline)', 'score': round(0.40 + vest_pct/100.0, 3), 'coverage_pct': vest_pct})

    if has_helmet and has_vest:
        status = 'COMPLIANT'
    elif uncertain:
        status = 'UNCERTAIN'
    else:
        status = 'NON_COMPLIANT'

    return {
        'status': status,
        'helmet_coverage_pct': helmet_pct,
        'vest_coverage_pct': vest_pct,
        'detections': detections
    }

if __name__ == '__main__':
    cases = [
        ('scratch/test_no_ppe.jpg', 'Case 1: No PPE (Civilian Clothes)'),
        ('scratch/test_helmet_only.jpg', 'Case 2: Helmet Only (No Vest)'),
        ('scratch/test_vest_only.jpg', 'Case 3: Vest Only (No Helmet)'),
        ('scratch/test_compliant.jpg', 'Case 4: Full PPE Compliant (Helmet + Vest)'),
        ('scratch/test_borderline.jpg', 'Case 5: Borderline / Low Lighting')
    ]
    for p, label in cases:
        res = analyze_ppe(p)
        print(f'=== {label} ===')
        print("Status:", res["status"])
        print(f"Helmet Coverage: {res['helmet_coverage_pct']}%, Vest Coverage: {res['vest_coverage_pct']}%")
        print("Detections:", res["detections"])
