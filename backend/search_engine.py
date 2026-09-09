"""
VOLTERRA Hierarchical Location Search Engine
=============================================
Provides precision geographic entity resolution and autocomplete suggestions
using real EV charging station data from final_india_dataset.csv.

Search Hierarchy:
  1. STATE
  2. CITY / MUNICIPALITY
  3. DISTRICT / AREA / NEIGHBORHOOD
  4. SPECIFIC STATION NAME

Supports:
  - Simple searches: "Gujarat", "Surat", "Rajasthan", "Mumbai", "Delhi"
  - Precision comma-separated: "Gujarat, Surat", "Gujarat, Surat, Vesu", "Gujarat, Surat, Vesu, [station]"
  - Ambiguous city detection (e.g., "Bilaspur") with state-disambiguated suggestions
  - Real counts and dynamic station coordinate bounding boxes
"""

import re
from typing import Dict, List, Any, Optional
import numpy as np
import pandas as pd


class LocationSearchEngine:
    def __init__(self, df: pd.DataFrame, stations: List[Dict[str, Any]]):
        self.df = df
        self.stations = stations
        self.station_map = {s['id']: s for s in stations}
        self.states = {}
        self.cities = {}
        self.city_state_map = {}
        self._build_indexes()

    def _build_indexes(self):
        # 1. State Index
        for state_name, group in self.df.groupby('state'):
            if pd.isna(state_name):
                continue
            st_clean = str(state_name).strip()
            st_norm = st_clean.lower()
            indices = group.index.tolist()
            min_lat, max_lat = float(group['latitude'].min()), float(group['latitude'].max())
            min_lon, max_lon = float(group['longitude'].min()), float(group['longitude'].max())
            
            self.states[st_norm] = {
                'name': st_clean,
                'norm': st_norm,
                'type': 'state',
                'count': len(indices),
                'indices': indices,
                'bounds': [min_lat, min_lon, max_lat, max_lon],
                'center': [(min_lat + max_lat) / 2.0, (min_lon + max_lon) / 2.0]
            }

        # 2. City & District Index
        for state_name, st_group in self.df.groupby('state'):
            if pd.isna(state_name):
                continue
            st_clean = str(state_name).strip()
            st_norm = st_clean.lower()

            # Process 'city'
            for city_name, c_group in st_group.groupby('city'):
                if pd.isna(city_name) or not str(city_name).strip():
                    continue
                c_clean = str(city_name).strip()
                c_norm = c_clean.lower()
                c_base = re.sub(r'\s+city$', '', c_norm).strip()

                for key in set([c_norm, c_base]):
                    if not key or len(key) < 2:
                        continue
                    indices = c_group.index.tolist()
                    min_lat, max_lat = float(c_group['latitude'].min()), float(c_group['latitude'].max())
                    min_lon, max_lon = float(c_group['longitude'].min()), float(c_group['longitude'].max())
                    
                    pair_key = (key, st_norm)
                    if pair_key in self.city_state_map:
                        existing = self.city_state_map[pair_key]
                        merged = list(set(existing['indices'] + indices))
                        sub = self.df.loc[merged]
                        existing['count'] = len(merged)
                        existing['indices'] = merged
                        existing['bounds'] = [float(sub['latitude'].min()), float(sub['longitude'].min()), float(sub['latitude'].max()), float(sub['longitude'].max())]
                        existing['center'] = [(existing['bounds'][0] + existing['bounds'][2]) / 2.0, (existing['bounds'][1] + existing['bounds'][3]) / 2.0]
                    else:
                        entry = {
                            'name': c_clean,
                            'display_name': c_base.title() if c_base else c_clean,
                            'state': st_clean,
                            'type': 'city',
                            'count': len(indices),
                            'indices': indices,
                            'bounds': [min_lat, min_lon, max_lat, max_lon],
                            'center': [(min_lat + max_lat) / 2.0, (min_lon + max_lon) / 2.0]
                        }
                        self.city_state_map[pair_key] = entry
                        if key not in self.cities:
                            self.cities[key] = []
                        self.cities[key].append(entry)

            # Process 'district' (covers municipal/district entities like Surat, Mumbai, Bengaluru Urban)
            for dist_name, d_group in st_group.groupby('district'):
                if pd.isna(dist_name) or not str(dist_name).strip():
                    continue
                d_clean = str(dist_name).strip()
                d_norm = d_clean.lower()
                d_base = re.sub(r'\s+(district|dist|urban|rural)$', '', d_norm).strip()

                for key in set([d_norm, d_base]):
                    if not key or len(key) < 2:
                        continue
                    pair_key = (key, st_norm)
                    indices = d_group.index.tolist()
                    if pair_key in self.city_state_map:
                        existing = self.city_state_map[pair_key]
                        merged = list(set(existing['indices'] + indices))
                        sub = self.df.loc[merged]
                        existing['count'] = len(merged)
                        existing['indices'] = merged
                        existing['bounds'] = [float(sub['latitude'].min()), float(sub['longitude'].min()), float(sub['latitude'].max()), float(sub['longitude'].max())]
                        existing['center'] = [(existing['bounds'][0] + existing['bounds'][2]) / 2.0, (existing['bounds'][1] + existing['bounds'][3]) / 2.0]
                    else:
                        min_lat, max_lat = float(d_group['latitude'].min()), float(d_group['latitude'].max())
                        min_lon, max_lon = float(d_group['longitude'].min()), float(d_group['longitude'].max())
                        entry = {
                            'name': d_clean,
                            'display_name': d_base.title() if d_base else d_clean,
                            'state': st_clean,
                            'type': 'city',
                            'count': len(indices),
                            'indices': indices,
                            'bounds': [min_lat, min_lon, max_lat, max_lon],
                            'center': [(min_lat + max_lat) / 2.0, (min_lon + max_lon) / 2.0]
                        }
                        self.city_state_map[pair_key] = entry
                        if key not in self.cities:
                            self.cities[key] = []
                        self.cities[key].append(entry)

    def resolve_query(self, query: str, limit: int = 1500) -> Dict[str, Any]:
        """
        Resolves query using geographic hierarchy: STATE -> CITY -> AREA -> STATION.
        Returns matched stations, geographic bounds, center, and entity type.
        """
        if not query or not str(query).strip():
            return {
                'query': query,
                'entity_type': 'all',
                'name': 'India',
                'total': len(self.stations),
                'bounds': None,
                'center': None,
                'stations': [],
                'selected_station': None
            }

        raw_parts = [p.strip() for p in query.split(',') if p.strip()]
        if not raw_parts:
            return {
                'query': query,
                'entity_type': 'none',
                'name': query,
                'total': 0,
                'bounds': None,
                'center': None,
                'stations': [],
                'selected_station': None,
                'message': 'No EV stations found for this location.'
            }

        parts = [p.lower() for p in raw_parts]

        # ----------------------------------------------------
        # CASE 1: Single Token Search
        # ----------------------------------------------------
        if len(parts) == 1:
            p0 = parts[0]

            # Priority 1: Exact or direct STATE match
            if p0 in self.states:
                st = self.states[p0]
                matched_stations = [self.stations[i] for i in st['indices']]
                # Sample if above limit
                return_stations = matched_stations[:limit]
                return {
                    'query': query,
                    'entity_type': 'state',
                    'name': st['name'],
                    'state': st['name'],
                    'total': len(matched_stations),
                    'bounds': st['bounds'],
                    'center': st['center'],
                    'stations': return_stations,
                    'selected_station': None
                }

            # State prefix match (e.g. "uttar", "rajas")
            st_prefix = [s for s in self.states.values() if s['norm'].startswith(p0)]
            if len(st_prefix) == 1:
                st = st_prefix[0]
                matched_stations = [self.stations[i] for i in st['indices']]
                return {
                    'query': query,
                    'entity_type': 'state',
                    'name': st['name'],
                    'state': st['name'],
                    'total': len(matched_stations),
                    'bounds': st['bounds'],
                    'center': st['center'],
                    'stations': matched_stations[:limit],
                    'selected_station': None
                }

            # Priority 2: CITY match
            if p0 in self.cities:
                entries = self.cities[p0]
                if len(entries) == 1:
                    c = entries[0]
                    matched_stations = [self.stations[i] for i in c['indices']]
                    return {
                        'query': query,
                        'entity_type': 'city',
                        'name': f"{c['display_name']}, {c['state']}",
                        'city': c['display_name'],
                        'state': c['state'],
                        'total': len(matched_stations),
                        'bounds': c['bounds'],
                        'center': c['center'],
                        'stations': matched_stations[:limit],
                        'selected_station': None
                    }
                else:
                    # Ambiguous city across multiple states (e.g. "Bilaspur")
                    all_indices = []
                    for e in entries:
                        all_indices.extend(e['indices'])
                    all_indices = list(set(all_indices))
                    sub = self.df.loc[all_indices]
                    matched_stations = [self.stations[i] for i in all_indices]
                    return {
                        'query': query,
                        'entity_type': 'city_ambiguous',
                        'name': entries[0]['display_name'],
                        'city': entries[0]['display_name'],
                        'ambiguous_states': [e['state'] for e in entries],
                        'total': len(matched_stations),
                        'bounds': [float(sub['latitude'].min()), float(sub['longitude'].min()), float(sub['latitude'].max()), float(sub['longitude'].max())],
                        'center': [float(sub['latitude'].mean()), float(sub['longitude'].mean())],
                        'stations': matched_stations[:limit],
                        'selected_station': None
                    }

            # City prefix match
            city_prefix_matches = []
            for k, entries in self.cities.items():
                if k.startswith(p0):
                    city_prefix_matches.extend(entries)
            if len(city_prefix_matches) == 1:
                c = city_prefix_matches[0]
                matched_stations = [self.stations[i] for i in c['indices']]
                return {
                    'query': query,
                    'entity_type': 'city',
                    'name': f"{c['display_name']}, {c['state']}",
                    'city': c['display_name'],
                    'state': c['state'],
                    'total': len(matched_stations),
                    'bounds': c['bounds'],
                    'center': c['center'],
                    'stations': matched_stations[:limit],
                    'selected_station': None
                }

            # Priority 3: AREA / LOCATION match
            area_mask = (self.df['location'].str.contains(r'\b' + re.escape(p0) + r'\b', case=False, na=False)) | \
                        (self.df['district'].str.contains(r'\b' + re.escape(p0) + r'\b', case=False, na=False))
            if area_mask.sum() > 0:
                sub = self.df[area_mask]
                matched_stations = [self.stations[i] for i in sub.index.tolist()]
                return {
                    'query': query,
                    'entity_type': 'area',
                    'name': raw_parts[0].title(),
                    'total': len(matched_stations),
                    'bounds': [float(sub['latitude'].min()), float(sub['longitude'].min()), float(sub['latitude'].max()), float(sub['longitude'].max())],
                    'center': [float(sub['latitude'].mean()), float(sub['longitude'].mean())],
                    'stations': matched_stations[:limit],
                    'selected_station': None
                }

            # Priority 4: Specific STATION name match
            st_mask = self.df['station_name'].str.contains(re.escape(p0), case=False, na=False)
            if st_mask.sum() > 0:
                sub = self.df[st_mask]
                matched_stations = [self.stations[i] for i in sub.index.tolist()]
                sel_st = matched_stations[0] if len(matched_stations) == 1 else None
                return {
                    'query': query,
                    'entity_type': 'station',
                    'name': raw_parts[0],
                    'total': len(matched_stations),
                    'bounds': [float(sub['latitude'].min()), float(sub['longitude'].min()), float(sub['latitude'].max()), float(sub['longitude'].max())],
                    'center': [float(sub['latitude'].mean()), float(sub['longitude'].mean())],
                    'stations': matched_stations[:limit],
                    'selected_station': sel_st
                }

            # No results
            return {
                'query': query,
                'entity_type': 'none',
                'name': raw_parts[0],
                'total': 0,
                'bounds': None,
                'center': None,
                'stations': [],
                'selected_station': None,
                'message': 'No EV stations found for this location.'
            }

        # ----------------------------------------------------
        # CASE 2: 2-Part Precision Search: [State, City] or [City, State] or [City, Area]
        # ----------------------------------------------------
        if len(parts) == 2:
            p0, p1 = parts[0], parts[1]

            # Scenario A: [State, City/District/Area] e.g. "Gujarat, Surat"
            if p0 in self.states:
                st = self.states[p0]
                st_name = st['name']
                # Check city in that state
                if (p1, p0) in self.city_state_map:
                    c = self.city_state_map[(p1, p0)]
                    matched_stations = [self.stations[i] for i in c['indices']]
                    return {
                        'query': query,
                        'entity_type': 'city',
                        'name': f"{c['display_name']}, {st_name}",
                        'state': st_name,
                        'city': c['display_name'],
                        'total': len(matched_stations),
                        'bounds': c['bounds'],
                        'center': c['center'],
                        'stations': matched_stations[:limit],
                        'selected_station': None
                    }
                # Check area/location in this state
                st_sub = self.df[self.df['state'].str.lower() == p0]
                area_mask = (st_sub['location'].str.contains(re.escape(p1), case=False, na=False)) | \
                            (st_sub['city'].str.contains(re.escape(p1), case=False, na=False)) | \
                            (st_sub['district'].str.contains(re.escape(p1), case=False, na=False))
                if area_mask.sum() > 0:
                    matched = st_sub[area_mask]
                    matched_stations = [self.stations[i] for i in matched.index.tolist()]
                    return {
                        'query': query,
                        'entity_type': 'area',
                        'name': f"{raw_parts[1].title()}, {st_name}",
                        'state': st_name,
                        'area': raw_parts[1].title(),
                        'total': len(matched_stations),
                        'bounds': [float(matched['latitude'].min()), float(matched['longitude'].min()), float(matched['latitude'].max()), float(matched['longitude'].max())],
                        'center': [float(matched['latitude'].mean()), float(matched['longitude'].mean())],
                        'stations': matched_stations[:limit],
                        'selected_station': None
                    }

            # Scenario B: [City, State] e.g. "Surat, Gujarat"
            if p1 in self.states and (p0, p1) in self.city_state_map:
                c = self.city_state_map[(p0, p1)]
                matched_stations = [self.stations[i] for i in c['indices']]
                return {
                    'query': query,
                    'entity_type': 'city',
                    'name': f"{c['display_name']}, {c['state']}",
                    'state': c['state'],
                    'city': c['display_name'],
                    'total': len(matched_stations),
                    'bounds': c['bounds'],
                    'center': c['center'],
                    'stations': matched_stations[:limit],
                    'selected_station': None
                }

            # Scenario C: [City, Area] e.g. "Surat, Vesu"
            if p0 in self.cities:
                entries = self.cities[p0]
                all_idx = []
                for e in entries:
                    all_idx.extend(e['indices'])
                city_sub = self.df.loc[all_idx]
                area_mask = (city_sub['location'].str.contains(re.escape(p1), case=False, na=False)) | \
                            (city_sub['station_name'].str.contains(re.escape(p1), case=False, na=False))
                if area_mask.sum() > 0:
                    matched = city_sub[area_mask]
                    matched_stations = [self.stations[i] for i in matched.index.tolist()]
                    sel_st = matched_stations[0] if len(matched_stations) == 1 else None
                    return {
                        'query': query,
                        'entity_type': 'area',
                        'name': f"{raw_parts[1].title()}, {entries[0]['display_name']}",
                        'city': entries[0]['display_name'],
                        'state': entries[0]['state'],
                        'area': raw_parts[1].title(),
                        'total': len(matched_stations),
                        'bounds': [float(matched['latitude'].min()), float(matched['longitude'].min()), float(matched['latitude'].max()), float(matched['longitude'].max())],
                        'center': [float(matched['latitude'].mean()), float(matched['longitude'].mean())],
                        'stations': matched_stations[:limit],
                        'selected_station': sel_st
                    }

            return {
                'query': query,
                'entity_type': 'none',
                'name': query,
                'total': 0,
                'bounds': None,
                'center': None,
                'stations': [],
                'selected_station': None,
                'message': 'No EV stations found for this location.'
            }

        # ----------------------------------------------------
        # CASE 3: 3-Part Precision Search: [State, City, Area]
        # ----------------------------------------------------
        if len(parts) == 3:
            p0, p1, p2 = parts[0], parts[1], parts[2]
            st_name = None
            if p0 in self.states:
                st_name = self.states[p0]['name']
            else:
                for k, v in self.states.items():
                    if p0 in k:
                        st_name = v['name']
                        p0 = k
                        break

            if st_name:
                st_sub = self.df[self.df['state'].str.lower() == p0]
                city_mask = (st_sub['city'].str.contains(re.escape(p1), case=False, na=False)) | \
                            (st_sub['district'].str.contains(re.escape(p1), case=False, na=False)) | \
                            (st_sub['location'].str.contains(re.escape(p1), case=False, na=False))
                city_sub = st_sub[city_mask]

                if len(city_sub) > 0:
                    area_mask = (city_sub['location'].str.contains(re.escape(p2), case=False, na=False)) | \
                                (city_sub['station_name'].str.contains(re.escape(p2), case=False, na=False))
                    if area_mask.sum() > 0:
                        matched = city_sub[area_mask]
                        matched_stations = [self.stations[i] for i in matched.index.tolist()]
                        sel_st = matched_stations[0] if len(matched_stations) == 1 else None
                        return {
                            'query': query,
                            'entity_type': 'area',
                            'name': f"{raw_parts[2].title()}, {raw_parts[1].title()}, {st_name}",
                            'state': st_name,
                            'city': raw_parts[1].title(),
                            'area': raw_parts[2].title(),
                            'total': len(matched_stations),
                            'bounds': [float(matched['latitude'].min()), float(matched['longitude'].min()), float(matched['latitude'].max()), float(matched['longitude'].max())],
                            'center': [float(matched['latitude'].mean()), float(matched['longitude'].mean())],
                            'stations': matched_stations[:limit],
                            'selected_station': sel_st
                        }

            return {
                'query': query,
                'entity_type': 'none',
                'name': query,
                'total': 0,
                'bounds': None,
                'center': None,
                'stations': [],
                'selected_station': None,
                'message': 'No EV stations found for this location.'
            }

        # ----------------------------------------------------
        # CASE 4: 4-Part Precision Search: [State, City, Area, Station]
        # ----------------------------------------------------
        if len(parts) >= 4:
            p0, p1, p2, p3 = parts[0], parts[1], parts[2], parts[3]
            st_sub = self.df[self.df['state'].str.lower() == p0]
            city_sub = st_sub[(st_sub['city'].str.contains(re.escape(p1), case=False, na=False)) | (st_sub['district'].str.contains(re.escape(p1), case=False, na=False))]
            area_sub = city_sub[city_sub['location'].str.contains(re.escape(p2), case=False, na=False)]
            st_match = area_sub[area_sub['station_name'].str.contains(re.escape(p3), case=False, na=False)]
            if len(st_match) > 0:
                matched_stations = [self.stations[i] for i in st_match.index.tolist()]
                return {
                    'query': query,
                    'entity_type': 'station',
                    'name': raw_parts[3],
                    'state': raw_parts[0].title(),
                    'city': raw_parts[1].title(),
                    'area': raw_parts[2].title(),
                    'total': len(matched_stations),
                    'bounds': [float(st_match['latitude'].min()), float(st_match['longitude'].min()), float(st_match['latitude'].max()), float(st_match['longitude'].max())],
                    'center': [float(st_match['latitude'].mean()), float(st_match['longitude'].mean())],
                    'stations': matched_stations[:limit],
                    'selected_station': matched_stations[0]
                }

            return {
                'query': query,
                'entity_type': 'none',
                'name': query,
                'total': 0,
                'bounds': None,
                'center': None,
                'stations': [],
                'selected_station': None,
                'message': 'No EV stations found for this location.'
            }

    def get_suggestions(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """
        Fast hierarchical autocomplete suggestions based on current typing state.
        Uses real counts from final_india_dataset.csv.
        """
        if not query or not str(query).strip():
            return []

        q = query.strip().lower()
        parts = [p.strip().lower() for p in query.split(',') if p.strip()]
        suggestions = []

        if len(parts) <= 1:
            # 1. State suggestions
            for k, st in self.states.items():
                if k.startswith(q) or (len(q) >= 3 and q in k):
                    suggestions.append({
                        'type': 'state',
                        'title': st['name'],
                        'subtitle': f"State · {st['count']:,} stations",
                        'value': st['name'],
                        'count': st['count']
                    })

            # 2. City suggestions
            for k, entries in self.cities.items():
                if k.startswith(q) or (len(q) >= 3 and q in k):
                    for c in entries:
                        title = f"{c['display_name']}, {c['state']}"
                        val = f"{c['state']}, {c['display_name']}"
                        suggestions.append({
                            'type': 'city',
                            'title': title,
                            'subtitle': f"City · {c['count']:,} stations",
                            'value': val,
                            'count': c['count']
                        })

            # Rank by priority (State > City), prefix match, then station count
            suggestions.sort(key=lambda x: (
                0 if x['type'] == 'state' else 1,
                0 if x['value'].lower().startswith(q) else 1,
                -x['count']
            ))

        elif len(parts) == 2:
            p0, p1 = parts[0], parts[1]
            if p0 in self.states:
                st_name = self.states[p0]['name']
                for (c_key, st_key), c in self.city_state_map.items():
                    if st_key == p0 and (c_key.startswith(p1) or p1 in c_key):
                        suggestions.append({
                            'type': 'city',
                            'title': f"{st_name} → {c['display_name']}",
                            'subtitle': f"City · {c['count']:,} stations",
                            'value': f"{st_name}, {c['display_name']}",
                            'count': c['count']
                        })
            elif p0 in self.cities:
                for c in self.cities[p0]:
                    city_sub = self.df.loc[c['indices']]
                    loc_matches = city_sub[city_sub['location'].str.contains(re.escape(p1), case=False, na=False)]
                    if len(loc_matches) > 0:
                        suggestions.append({
                            'type': 'area',
                            'title': f"{c['display_name']} → {p1.title()}",
                            'subtitle': f"Area · {len(loc_matches):,} stations",
                            'value': f"{c['state']}, {c['display_name']}, {p1.title()}",
                            'count': len(loc_matches)
                        })

        elif len(parts) == 3:
            p0, p1, p2 = parts[0], parts[1], parts[2]
            if p0 in self.states:
                st_sub = self.df[self.df['state'].str.lower() == p0]
                city_sub = st_sub[(st_sub['city'].str.contains(re.escape(p1), case=False, na=False)) | (st_sub['district'].str.contains(re.escape(p1), case=False, na=False))]
                if len(city_sub) > 0:
                    loc_matches = city_sub[city_sub['location'].str.contains(re.escape(p2), case=False, na=False)]
                    if len(loc_matches) > 0:
                        suggestions.append({
                            'type': 'area',
                            'title': f"{self.states[p0]['name']} → {p1.title()} → {p2.title()}",
                            'subtitle': f"Area · {len(loc_matches):,} stations",
                            'value': f"{self.states[p0]['name']}, {p1.title()}, {p2.title()}",
                            'count': len(loc_matches)
                        })

        # Deduplicate
        seen = set()
        unique = []
        for s in suggestions:
            if s['value'] not in seen:
                seen.add(s['value'])
                unique.append(s)
            if len(unique) >= limit:
                break

        return unique
