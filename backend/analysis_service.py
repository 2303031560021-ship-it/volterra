"""
VOLTERRA Backend - Core Location Intelligence & Analysis Service
================================================================
Implements VOLTERRA's analytical model comparing candidate locations
against real charging stations from final_india_dataset.csv.
"""

import math
from backend.data_loader import get_loader

def get_sector(c_lat, c_lng, s_lat, s_lng):
    d_lat = s_lat - c_lat
    d_lng = s_lng - c_lng
    angle = math.atan2(d_lat, d_lng)
    deg = (math.degrees(angle) + 360.0) % 360.0
    if deg >= 337.5 or deg < 22.5: return 'E'
    if deg >= 22.5 and deg < 67.5: return 'NE'
    if deg >= 67.5 and deg < 112.5: return 'N'
    if deg >= 112.5 and deg < 157.5: return 'NW'
    if deg >= 157.5 and deg < 202.5: return 'W'
    if deg >= 202.5 and deg < 247.5: return 'SW'
    if deg >= 247.5 and deg < 292.5: return 'S'
    if deg >= 292.5 and deg < 337.5: return 'SE'
    return 'Unknown'

def analyze_location(candidate, parameters):
    """
    Core VOLTERRA location analysis algorithm.
    """
    loader = get_loader()

    lat = float(candidate['lat'])
    lng = float(candidate['lng'])
    radius = float(parameters.get('radius', 5))
    focus = parameters.get('focus', 'Any')
    min_power = parameters.get('minPower', 'Any')

    nearby_stations, relevant_stations = loader.query_radius(
        lat=lat,
        lon=lng,
        radius_km=radius,
        focus=focus,
        min_power=min_power
    )

    N = len(relevant_stations)
    area = math.pi * radius * radius
    density = N / area if area > 0 else 0

    # A. Infrastructure Pressure
    if N >= 5 or density >= 0.5:
        pressure_class = 'High'
    elif N >= 2:
        pressure_class = 'Moderate'
    else:
        pressure_class = 'Low'

    factors_pressure = {
        'value': N,
        'density': round(density, 2),
        'classification': pressure_class,
        'text': f"{N} {'charger' if N == 1 else 'chargers'} within {radius} km"
    }

    # B. Proximity & Access Gap
    nearest_dist = relevant_stations[0]['distance'] if N > 0 else None
    if nearest_dist is None:
        access_class = 'Large'
    elif nearest_dist <= 1.0:
        access_class = 'Small'
    elif nearest_dist <= 3.0:
        access_class = 'Moderate'
    else:
        access_class = 'Large'

    factors_access = {
        'nearestDistance': nearest_dist,
        'classification': access_class,
        'text': f"Nearest charger: {nearest_dist:.1f} km" if nearest_dist is not None else "No chargers nearby"
    }

    # C. Charging Mix Gap
    ac_count = sum(1 for s in nearby_stations if 'AC' in (s.get('charger_types') or []) or 'AC' in (s.get('ac_dc') or ''))
    dc_count = sum(1 for s in nearby_stations if 'DC' in (s.get('charger_types') or []) or 'DC' in (s.get('ac_dc') or ''))

    if focus in ('DC', 'High-Power DC'):
        if dc_count == 0: mix_class = 'DC underrepresented'
        elif dc_count >= 3: mix_class = 'DC well represented'
        else: mix_class = 'DC moderately represented'
    elif focus == 'AC':
        if ac_count == 0: mix_class = 'AC underrepresented'
        elif ac_count >= 3: mix_class = 'AC well represented'
        else: mix_class = 'AC moderately represented'
    else:
        mix_class = 'Mixed'

    if not nearby_stations:
        pct_str = "No chargers nearby"
    elif focus == 'Any':
        pct_str = "Mixed charging types nearby"
    else:
        focus_count = dc_count if 'DC' in focus else ac_count
        pct_str = f"{round((focus_count / len(nearby_stations)) * 100)}% selected type"

    factors_mix = {
        'acCount': ac_count,
        'dcCount': dc_count,
        'classification': mix_class,
        'text': pct_str
    }

    # D. Power Capability Gap
    stations_with_power = [s for s in relevant_stations if s.get('power_kw') is not None]
    power_vals = sorted([s['power_kw'] for s in stations_with_power])
    median_power = None
    if power_vals:
        mid = len(power_vals) // 2
        median_power = power_vals[mid] if len(power_vals) % 2 != 0 else round((power_vals[mid - 1] + power_vals[mid]) / 2.0, 1)

    if not power_vals:
        power_class = 'Power data limited'
    elif median_power >= 60:
        power_class = 'High-power present'
    elif median_power >= 22:
        power_class = 'Moderate power'
    else:
        power_class = 'High-power limited'

    factors_power = {
        'medianPower': median_power,
        'coverage': len(stations_with_power),
        'classification': power_class,
        'text': f"Median: {median_power} kW" if median_power is not None else "Unknown"
    }

    # E. Spatial Pattern
    sector_count = 0
    if N >= 2:
        sectors = {get_sector(lat, lng, st['latitude'], st['longitude']) for st in relevant_stations}
        sector_count = len(sectors)
        if sector_count >= 4: spatial_class = 'Broadly distributed'
        elif sector_count >= 2: spatial_class = 'Concentrated'
        else: spatial_class = 'Highly concentrated'
    else:
        spatial_class = 'Insufficient evidence'

    factors_spatial = {
        'sectorCount': sector_count,
        'classification': spatial_class,
        'text': f"{sector_count} / 8 sectors represented" if N >= 2 else "Too few chargers"
    }

    # F. Operator Landscape
    op_counts = {}
    known_ops = 0
    for st in relevant_stations:
        op = st.get('operator')
        if op and op != 'Unknown Operator':
            op_counts[op] = op_counts.get(op, 0) + 1
            known_ops += 1

    op_keys = list(op_counts.keys())
    if len(op_keys) > 2: op_class = 'Distributed'
    elif len(op_keys) == 2: op_class = 'Moderately concentrated'
    elif len(op_keys) == 1 and known_ops >= 2: op_class = 'Highly concentrated'
    else: op_class = 'Insufficient evidence'

    factors_operator = {
        'identifiedOperators': len(op_keys),
        'classification': op_class,
        'text': f"{len(op_keys)} identified operators" if op_keys else "Unknown operators"
    }

    # G. Synthesis: Gap Score & Signal
    gap_score = 0
    if pressure_class == 'Low': gap_score += 3
    elif pressure_class == 'Moderate': gap_score += 1

    if access_class == 'Large': gap_score += 3
    elif access_class == 'Moderate': gap_score += 1

    if 'underrepresented' in mix_class: gap_score += 2
    if power_class == 'High-power limited': gap_score += 2

    if N == 0:
        signal_class = 'LIMITED MAPPED COVERAGE'
        signal_color = 'gray'
    elif gap_score >= 6:
        signal_class = 'STRONG CHARGING GAP'
        signal_color = 'green'
    elif gap_score >= 3:
        signal_class = 'MODERATE CHARGING GAP'
        signal_color = 'yellow'
    else:
        signal_class = 'LIMITED CHARGING GAP'
        signal_color = 'gray'

    type_label = 'chargers' if focus == 'Any' else f"{focus} chargers"
    single_type_label = 'charger' if focus == 'Any' else f"{focus} charger"

    if N == 0:
        primary_sentence = f"No {type_label} are mapped within {radius} km."
        meaning = "Because there is very little mapped infrastructure here, existing evidence is limited."
    elif signal_color == 'green':
        primary_sentence = f"Few similar {type_label} are nearby, and the nearest ones are relatively far away."
        meaning = "This area shows a noticeable gap in existing charging coverage compared to broader network density."
    elif signal_color == 'yellow':
        primary_sentence = f"Some {type_label} are nearby, but they are not very common in this area."
        meaning = "Some charging is already available here, but overall network coverage remains moderate."
    else:
        primary_sentence = f"Similar {type_label} are already fairly common and close to this site."
        meaning = "This area is already well covered by existing charging infrastructure."

    evidence = []
    # Fact 1: Count
    evidence.append({
        'headline': f"{N} {single_type_label if N == 1 else type_label}",
        'text': f"{'is' if N == 1 else 'are'} mapped within {radius} km."
    })

    # Fact 2: Distance
    if N > 0 and nearest_dist is not None:
        evidence.append({
            'headline': f"{nearest_dist:.1f} km",
            'text': f"to the nearest {single_type_label}."
        })

    # Fact 3: Mix or Power
    if N > 0 and len(nearby_stations) > N:
        evidence.append({
            'headline': f"{N} of {len(nearby_stations)}",
            'text': f"nearby chargers {'is' if N == 1 else 'are'} {focus if focus != 'Any' else 'relevant'}."
        })
    elif N > 0 and median_power is not None:
        evidence.append({
            'headline': f"{median_power} kW",
            'text': f"median power across nearby relevant chargers."
        })

    if len(evidence) < 3:
        if N == 0:
            evidence.append({'headline': 'Limited data', 'text': 'This area has limited mapped coverage.'})
        elif signal_color == 'green':
            evidence.append({'headline': 'Strong gap', 'text': 'This area has a strong charging gap.'})
        elif signal_color == 'yellow':
            evidence.append({'headline': 'Moderate gap', 'text': 'This area has a moderate charging gap.'})
        else:
            evidence.append({'headline': 'Well covered', 'text': 'This area is already well covered.'})

    # Detail strings
    if N >= 2 and sector_count >= 4:
        factors_spatial['text'] = "Chargers are spread across most parts of the search area."
    elif N >= 2:
        factors_spatial['text'] = "Most chargers are clustered on one side of the search area."
    else:
        factors_spatial['text'] = "Not enough nearby chargers to clearly describe the spread."

    if len(op_keys) == 1 and known_ops >= 2:
        factors_operator['text'] = "Most nearby chargers are run by the same operator."
    elif len(op_keys) > 1:
        factors_operator['text'] = "Nearby chargers are run by several different operators."
    else:
        factors_operator['text'] = "Operator information is limited for nearby chargers."

    if stations_with_power:
        factors_power['text'] = f"Power information is available for {len(stations_with_power)} of {N} nearby {type_label}."
    else:
        factors_power['text'] = "Power information is not available for nearby chargers."

    return {
        'candidate': candidate,
        'parameters': {
            'radius': radius,
            'focus': focus,
            'minPower': min_power
        },
        'nearbyCount': N,
        'allNearbyCount': len(nearby_stations),
        'relevantStations': relevant_stations,
        'factors': {
            'pressure': factors_pressure,
            'access': factors_access,
            'mix': factors_mix,
            'power': factors_power,
            'spatial': factors_spatial,
            'operator': factors_operator
        },
        'signal': {
            'classification': signal_class,
            'headline': signal_class,
            'color': signal_color,
            'primarySentence': primary_sentence,
            'meaning': meaning,
            'evidence': evidence[:3],
            'gapScore': gap_score
        },
        'raw': {
            'nearbyStations': nearby_stations,
            'opCounts': op_counts
        },
        'data_lineage': {
            'source': loader.summary.get('source'),
            'data_date': loader.summary.get('data_date'),
            'total_dataset_records': loader.summary.get('total_stations')
        }
    }

def find_alternative_areas(candidate, parameters):
    """
    Finds up to 3 diverse alternative areas around the candidate location
    anywhere in India based on actual network gap analysis.
    """
    loader = get_loader()
    c_lat = float(candidate['lat'])
    c_lng = float(candidate['lng'])
    radius = float(parameters.get('radius', 5))

    # Generate an adaptive grid around the candidate location (within 15km)
    step_km = max(1.5, radius * 0.4)
    # 1 deg lat ~ 111 km, 1 deg lng ~ 111 * cos(lat)
    lat_step = step_km / 111.0
    lng_step = step_km / (111.0 * max(0.2, math.cos(math.radians(c_lat))))

    candidates_grid = []
    # Grid offsets
    for d_lat_idx in range(-3, 4):
        for d_lng_idx in range(-3, 4):
            if d_lat_idx == 0 and d_lng_idx == 0:
                continue
            g_lat = c_lat + d_lat_idx * lat_step
            g_lng = c_lng + d_lng_idx * lng_step
            # Check if within 20km from candidate
            d_from_center = loader.haversine(c_lat, c_lng, g_lat, g_lng)
            if 2.0 <= d_from_center <= 20.0:
                candidates_grid.append((g_lat, g_lng, d_from_center))

    evaluated = []
    for g_lat, g_lng, dist_orig in candidates_grid:
        cand_obj = {
            'lat': round(g_lat, 6),
            'lng': round(g_lng, 6),
            'name': f"Area ({g_lat:.3f}, {g_lng:.3f})"
        }
        res = analyze_location(cand_obj, parameters)
        score = res['signal']['gapScore']

        # Favor areas with moderate/strong gap and some distance from candidate
        evaluated.append({
            'candidate': cand_obj,
            'distanceToOriginal': round(dist_orig, 1),
            'nearbyCount': res['nearbyCount'],
            'signal': res['signal'],
            'factors': res['factors'],
            'score': score
        })

    # Sort by score descending, then distance
    evaluated.sort(key=lambda x: (-x['score'], x['distanceToOriginal']))

    # Pick top 3 diverse areas (at least 3km apart)
    selected = []
    for item in evaluated:
        if len(selected) >= 3:
            break
        too_close = False
        for s in selected:
            d = loader.haversine(item['candidate']['lat'], item['candidate']['lng'], s['candidate']['lat'], s['candidate']['lng'])
            if d < 3.0:
                too_close = True
                break
        if not too_close:
            # Add human readable compass direction
            sector = get_sector(c_lat, c_lng, item['candidate']['lat'], item['candidate']['lng'])
            dist = item['distanceToOriginal']
            item['candidate']['name'] = f"{dist:.1f} km {sector} of current site"
            selected.append(item)

    return selected
