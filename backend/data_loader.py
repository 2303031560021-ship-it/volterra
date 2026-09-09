"""
VOLTERRA Backend - Data Loader and Spatial Index
================================================
Loads final_india_dataset.csv once at startup and provides
sub-millisecond spatial queries using a 3D Euclidean cKDTree
and fast numpy geographic bounding-box queries.
"""

from pathlib import Path
import math
import numpy as np
import pandas as pd
from scipy.spatial import cKDTree

DATASET_PATH = Path(__file__).resolve().parent.parent / "final_india_dataset.csv"
EARTH_RADIUS_KM = 6371.0088

class DataLoader:
    def __init__(self, csv_path=DATASET_PATH):
        self.csv_path = Path(csv_path)
        self.df = None
        self.stations = []
        self.station_map = {}
        self.lats = None
        self.lons = None
        self.tree = None
        self.summary = {}
        self.nationwide_sample = []
        self.search_engine = None
        self.load()

    def load(self):
        if not self.csv_path.exists():
            raise FileNotFoundError(f"Clean dataset not found at {self.csv_path}")

        print(f"[VOLTERRA] Loading clean dataset from {self.csv_path.name}...")
        df = pd.read_csv(self.csv_path)

        # Validate mandatory columns
        required_cols = [
            'station_id', 'station_name', 'state', 'district', 'city', 'location',
            'latitude', 'longitude', 'operator', 'govt_private', 'charger_type',
            'ac_dc', 'power_kw', 'connector_rating', 'num_connectors',
            'source_record_count', 'source', 'data_date', 'status', 'usage_cost',
            'review_flag'
        ]
        for col in required_cols:
            if col not in df.columns:
                raise ValueError(f"Missing required column in dataset: {col}")

        # Clean string / numeric representations
        df['latitude'] = pd.to_numeric(df['latitude'], errors='coerce')
        df['longitude'] = pd.to_numeric(df['longitude'], errors='coerce')
        df['power_kw'] = pd.to_numeric(df['power_kw'], errors='coerce')
        df['num_connectors'] = pd.to_numeric(df['num_connectors'], errors='coerce').fillna(1).astype(int)

        # Drop any row that might have invalid coordinates
        df = df.dropna(subset=['latitude', 'longitude']).reset_index(drop=True)
        self.df = df
        total = len(df)
        print(f"[VOLTERRA] Validated {total:,} physical EV charging stations across India.")

        self.lats = df['latitude'].values
        self.lons = df['longitude'].values

        # Build 3D spatial points on Earth sphere for cKDTree
        rad_lat = np.radians(self.lats)
        rad_lon = np.radians(self.lons)
        x = EARTH_RADIUS_KM * np.cos(rad_lat) * np.cos(rad_lon)
        y = EARTH_RADIUS_KM * np.cos(rad_lat) * np.sin(rad_lon)
        z = EARTH_RADIUS_KM * np.sin(rad_lat)
        points_3d = np.column_stack([x, y, z])

        self.tree = cKDTree(points_3d)
        print("[VOLTERRA] Spatial 3D cKDTree built successfully.")

        # Build fast lookup dictionary and list
        stations = []
        for idx, row in df.iterrows():
            station_dict = {
                'id': str(row['station_id']),
                'name': str(row['station_name']) if pd.notna(row['station_name']) and str(row['station_name']).strip() else 'EV Charging Station',
                'state': str(row['state']) if pd.notna(row['state']) else None,
                'district': str(row['district']) if pd.notna(row['district']) else None,
                'city': str(row['city']) if pd.notna(row['city']) else None,
                'location': str(row['location']) if pd.notna(row['location']) else None,
                'coordinates': [float(row['latitude']), float(row['longitude'])],
                'latitude': float(row['latitude']),
                'longitude': float(row['longitude']),
                'operator': str(row['operator']) if pd.notna(row['operator']) and str(row['operator']).strip() else 'Unknown Operator',
                'govt_private': str(row['govt_private']) if pd.notna(row['govt_private']) else None,
                'charger_type': str(row['charger_type']) if pd.notna(row['charger_type']) else 'Unknown',
                'ac_dc': str(row['ac_dc']) if pd.notna(row['ac_dc']) else 'AC/DC',
                'charger_types': [t.strip() for t in str(row['ac_dc']).split(';') if t.strip()] if pd.notna(row['ac_dc']) else [],
                'power_kw': float(row['power_kw']) if pd.notna(row['power_kw']) else None,
                'connector_rating': str(row['connector_rating']) if pd.notna(row['connector_rating']) else None,
                'num_connectors': int(row['num_connectors']) if pd.notna(row['num_connectors']) else 1,
                'source_record_count': int(row['source_record_count']) if pd.notna(row.get('source_record_count')) else 1,
                'source': str(row['source']) if pd.notna(row.get('source')) else 'BEE EV Public Charging Stations Data till 26 October 2025',
                'data_date': str(row['data_date']) if pd.notna(row.get('data_date')) else '2025-10-26',
                'status': str(row['status']).strip() if pd.notna(row.get('status')) and str(row['status']).strip() else None,
                'usage_cost': str(row['usage_cost']).strip() if pd.notna(row.get('usage_cost')) and str(row['usage_cost']).strip() else None,
                'review_flag': str(row['review_flag']).strip() if pd.notna(row.get('review_flag')) and str(row['review_flag']).strip() else None
            }
            stations.append(station_dict)
            self.station_map[station_dict['id']] = station_dict

        self.stations = stations

        # Build nationwide stratified sample across all states (1,600 stations)
        # Guarantees that every state in India is represented when viewing the country map
        samples = []
        for state, group in df.groupby('state', dropna=False):
            n_state = len(group)
            count = max(2, int(round((n_state / total) * 1600)))
            count = min(count, n_state)
            step = max(1, n_state // count)
            sampled_indices = group.index[::step][:count]
            samples.extend(sampled_indices)
        self.nationwide_sample = [stations[i] for i in samples]
        print(f"[VOLTERRA] Precomputed nationwide stratified sample: {len(self.nationwide_sample)} stations across all 35 States/UTs.")

        # Compute summary statistics
        states_counts = df['state'].dropna().value_counts().to_dict()
        operators_counts = df['operator'].dropna().value_counts().head(15).to_dict()
        cities_counts = df['city'].dropna().value_counts().head(15).to_dict()

        ac_count = int((df['ac_dc'].str.contains('AC', na=False)).sum())
        dc_count = int((df['ac_dc'].str.contains('DC', na=False)).sum())

        power_clean = df['power_kw'].dropna()

        self.summary = {
            'total_stations': total,
            'data_date': '2025-10-26',
            'source': 'BEE EV Public Charging Stations Data till 26 October 2025',
            'unique_states_count': len(states_counts),
            'unique_operators_count': int(df['operator'].nunique()),
            'unique_cities_count': int(df['city'].dropna().nunique()),
            'ac_stations_count': ac_count,
            'dc_stations_count': dc_count,
            'power_stats': {
                'min': float(power_clean.min()) if len(power_clean) else 0.0,
                'max': float(power_clean.max()) if len(power_clean) else 0.0,
                'median': float(power_clean.median()) if len(power_clean) else 0.0,
                'mean': round(float(power_clean.mean()), 2) if len(power_clean) else 0.0
            },
            'top_states': states_counts,
            'top_operators': operators_counts,
            'top_cities': cities_counts
        }
        print(f"[VOLTERRA] Network summary ready: {self.summary['unique_states_count']} States/UTs, {self.summary['unique_operators_count']} Operators.")

        # Build hierarchical location search engine
        from backend.search_engine import LocationSearchEngine
        self.search_engine = LocationSearchEngine(self.df, self.stations)
        print("[VOLTERRA] Hierarchical Location Search Engine ready.")

    def haversine(self, lat1, lon1, lat2, lon2):
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2.0) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2.0) ** 2
        return 2.0 * EARTH_RADIUS_KM * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

    def query_radius(self, lat, lon, radius_km=5.0, focus='Any', min_power='Any'):
        """
        Fast radius search using 3D chord distance bounding ball + exact spherical Haversine.
        """
        d_chord = 2.0 * EARTH_RADIUS_KM * math.sin((radius_km / EARTH_RADIUS_KM) / 2.0)

        rad_lat = math.radians(lat)
        rad_lon = math.radians(lon)
        qx = EARTH_RADIUS_KM * math.cos(rad_lat) * math.cos(rad_lon)
        qy = EARTH_RADIUS_KM * math.cos(rad_lat) * math.sin(rad_lon)
        qz = EARTH_RADIUS_KM * math.sin(rad_lat)

        candidate_indices = self.tree.query_ball_point([qx, qy, qz], d_chord * 1.001)

        nearby_stations = []
        for idx in candidate_indices:
            st = self.stations[idx]
            dist = self.haversine(lat, lon, st['latitude'], st['longitude'])
            if dist <= radius_km:
                st_copy = dict(st)
                st_copy['distance'] = round(dist, 2)
                nearby_stations.append(st_copy)

        # Sort all nearby stations by distance
        nearby_stations.sort(key=lambda x: x['distance'])

        # Filter relevant stations based on Focus & Power
        relevant_stations = []
        for st in nearby_stations:
            ac_dc_val = st.get('ac_dc') or ''
            ct_types = st.get('charger_types') or []

            # Focus filter
            if focus == 'AC':
                if 'AC' not in ct_types and 'AC' not in ac_dc_val:
                    continue
            elif focus == 'DC':
                if 'DC' not in ct_types and 'DC' not in ac_dc_val:
                    continue
            elif focus == 'High-Power DC':
                if 'DC' not in ct_types and 'DC' not in ac_dc_val:
                    continue
                if st['power_kw'] is None or st['power_kw'] < 50.0:
                    continue

            # Minimum power filter
            if min_power != 'Any':
                try:
                    p_threshold = float(min_power)
                    if st['power_kw'] is None or st['power_kw'] < p_threshold:
                        continue
                except ValueError:
                    pass

            relevant_stations.append(st)

        return nearby_stations, relevant_stations

    def filter_stations(self, search='', state='', type_filter='All', limit=1500, offset=0, bounds=None):
        """
        Geographic and text filtering for map exploration.
        - Viewport bounding-box filtering with sub-millisecond numpy mask
        - Nationwide stratified sampling when zoomed out to country scale
        - Full text search across operators, cities, districts, states, locations
        """
        limit = min(max(1, limit), 3000)

        def matches_type(station):
            return not type_filter or type_filter == 'All' or type_filter in (station.get('charger_types') or [])

        # 1. If hierarchical search query is provided, use LocationSearchEngine
        if search:
            res = self.search_engine.resolve_query(search, limit=len(self.stations))
            matched_stations = res['stations']
            if state and state != 'All':
                state_lower = state.lower().strip()
                matched_stations = [s for s in matched_stations if s.get('state') and s['state'].lower() == state_lower]
            matched_stations = [s for s in matched_stations if matches_type(s)]
            return {
                'total': len(matched_stations),
                'limit': limit,
                'offset': offset,
                'is_nationwide_sample': False,
                'entity_type': res['entity_type'],
                'name': res.get('name', search),
                'bounds': res['bounds'],
                'center': res['center'],
                'selected_station': res['selected_station'],
                'message': res.get('message'),
                'stations': matched_stations[offset:offset + limit]
            }

        # 2. Bounding box query
        if bounds:
            min_lat, min_lon, max_lat, max_lon = bounds
            d_lat = max_lat - min_lat
            d_lon = max_lon - min_lon

            # If zoomed out to nationwide view and no specific state
            if d_lat > 14.0 and d_lon > 14.0 and (not state or state == 'All'):
                filtered = self.nationwide_sample
                filtered = [s for s in filtered if matches_type(s)]
                total = sum(1 for s in self.stations if matches_type(s))
                return {
                    'total': total,
                    'limit': limit,
                    'offset': offset,
                    'is_nationwide_sample': True,
                    'bounds': None,
                    'center': None,
                    'stations': filtered[offset:offset + limit]
                }

            # Fast numpy boolean indexing across coordinates for the viewport
            mask = (self.lats >= min_lat) & (self.lats <= max_lat) & (self.lons >= min_lon) & (self.lons <= max_lon)
            matched_indices = np.where(mask)[0]
            matched_stations = [self.stations[i] for i in matched_indices]
        else:
            # If no bounds and no state
            if not state or state == 'All':
                filtered = self.nationwide_sample
                filtered = [s for s in filtered if matches_type(s)]
                total = sum(1 for s in self.stations if matches_type(s))
                return {
                    'total': total,
                    'limit': limit,
                    'offset': offset,
                    'is_nationwide_sample': True,
                    'bounds': None,
                    'center': None,
                    'stations': filtered[offset:offset + limit]
                }
            matched_stations = self.stations

        # 3. Filter by State if specified
        if state and state != 'All':
            st_lower = state.lower().strip()
            matched_stations = [s for s in matched_stations if s['state'] and s['state'].lower() == st_lower]

        # 4. Filter by Charger Type
        matched_stations = [s for s in matched_stations if matches_type(s)]

        total = len(matched_stations)
        paginated = matched_stations[offset:offset + limit]

        return {
            'total': total,
            'limit': limit,
            'offset': offset,
            'is_nationwide_sample': False,
            'bounds': None,
            'center': None,
            'stations': paginated
        }

# Global singleton
loader = None

def get_loader():
    global loader
    if loader is None:
        loader = DataLoader()
    return loader
