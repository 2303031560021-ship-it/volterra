import csv
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from tornado.testing import AsyncHTTPTestCase

from backend.analysis_service import analyze_location
from backend.data_loader import DataLoader
from backend.server import make_app


DATASET_FIELDS = [
    'station_id', 'station_name', 'state', 'district', 'city', 'location',
    'latitude', 'longitude', 'operator', 'govt_private', 'charger_type',
    'ac_dc', 'power_kw', 'connector_rating', 'num_connectors',
    'source_record_count', 'source', 'data_date', 'status', 'usage_cost',
    'review_flag'
]


def write_fixture(fields=DATASET_FIELDS):
    handle = tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, newline='', encoding='utf-8')
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    row = {
        'station_id': 'TEST-1',
        'station_name': 'Test Station',
        'state': 'Test State',
        'district': 'Test District',
        'city': 'Test City',
        'location': 'Test Area',
        'latitude': '21.1',
        'longitude': '72.8',
        'operator': 'Test Operator',
        'govt_private': 'Private',
        'charger_type': 'Fast',
        'ac_dc': 'AC;DC',
        'power_kw': '60',
        'connector_rating': 'CCS2',
        'num_connectors': '2',
        'source_record_count': '1',
        'source': 'Test source',
        'data_date': '2025-10-26',
        'status': 'Operational',
        'usage_cost': '15',
        'review_flag': '',
    }
    writer.writerow({field: row[field] for field in fields})
    handle.close()
    return Path(handle.name)


class LoaderContractTests(unittest.TestCase):
    def test_loader_requires_serialized_fields_and_preserves_values(self):
        path = write_fixture()
        try:
            loader = DataLoader(path)
            station = loader.stations[0]
            self.assertEqual(station['connector_rating'], 'CCS2')
            self.assertEqual(station['num_connectors'], 2)
            self.assertEqual(station['status'], 'Operational')
            self.assertEqual(station['usage_cost'], '15')
        finally:
            path.unlink()

    def test_loader_rejects_missing_serialized_field(self):
        fields = [field for field in DATASET_FIELDS if field != 'status']
        path = write_fixture(fields)
        try:
            with self.assertRaisesRegex(ValueError, 'status'):
                DataLoader(path)
        finally:
            path.unlink()


class SearchContractTests(unittest.TestCase):
    def test_search_total_and_offset_follow_type_filter(self):
        loader = DataLoader.__new__(DataLoader)
        loader.stations = [
            {'id': '1', 'state': 'Test', 'ac_dc': 'AC', 'charger_types': ['AC']},
            {'id': '2', 'state': 'Test', 'ac_dc': 'DC', 'charger_types': ['DC']},
            {'id': '3', 'state': 'Test', 'ac_dc': 'AC;DC', 'charger_types': ['AC', 'DC']},
        ]

        class SearchEngine:
            def resolve_query(self, query, limit):
                return {
                    'stations': loader.stations,
                    'total': len(loader.stations),
                    'entity_type': 'city',
                    'name': 'Test',
                    'bounds': None,
                    'center': None,
                    'selected_station': None,
                }

        loader.search_engine = SearchEngine()
        result = loader.filter_stations(search='Test', type_filter='AC', limit=1, offset=1)
        self.assertEqual(result['total'], 2)
        self.assertEqual([station['id'] for station in result['stations']], ['3'])


class AnalysisContractTests(unittest.TestCase):
    def test_analysis_shape_and_any_mix_text(self):
        station = {
            'id': '1', 'latitude': 21.1, 'longitude': 72.8,
            'coordinates': [21.1, 72.8], 'distance': 0.5,
            'charger_types': ['AC', 'DC'], 'ac_dc': 'AC;DC',
            'power_kw': 60, 'operator': 'Test Operator',
        }

        class Loader:
            summary = {'source': 'Test source', 'data_date': '2025-10-26', 'total_stations': 1}

            def query_radius(self, **kwargs):
                return [station], [station]

        with patch('backend.analysis_service.get_loader', return_value=Loader()):
            result = analyze_location({'lat': 21.1, 'lng': 72.8}, {'radius': 5, 'focus': 'Any', 'minPower': 'Any'})
        self.assertEqual(result['nearbyCount'], 1)
        self.assertIn('factors', result)
        self.assertEqual(result['factors']['mix']['text'], 'Mixed charging types nearby')
        self.assertIn('data_lineage', result)


class AlternativeAreaEndpointTests(AsyncHTTPTestCase):
    def get_app(self):
        return make_app()

    @patch('backend.server.find_alternative_areas', return_value=[{'score': 1}])
    def test_alternative_area_response_shape(self, _find_alternatives):
        response = self.fetch(
            '/api/alternative-areas',
            method='POST',
            body=json.dumps({'candidate': {'lat': 21.1, 'lng': 72.8}}),
            headers={'Content-Type': 'application/json'},
        )
        self.assertEqual(response.code, 200)
        self.assertEqual(json.loads(response.body)['alternatives'], [{'score': 1}])


if __name__ == '__main__':
    unittest.main()