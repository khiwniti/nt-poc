
import { Branch } from './types';

export const REGION_PATHS = {
  NORTH: "M150,20 L230,20 L280,60 L280,150 L200,200 L120,150 L100,80 Z",
  NORTHEAST: "M280,60 L450,60 L500,100 L500,250 L400,300 L280,250 L280,150 Z",
  CENTRAL: "M200,200 L280,150 L280,250 L400,300 L380,380 L300,420 L220,380 L180,300 Z",
  EAST: "M380,380 L480,350 L500,450 L400,480 L350,420 Z",
  SOUTH: "M220,380 L300,420 L280,550 L250,700 L150,650 L180,500 L200,400 Z"
};

export const BRANCHES: Branch[] = [
  {
    id: 'chiangmai',
    name: 'เชียงใหม่',
    region: 'Northern',
    coordinates: { x: 180, y: 80 },
    status: 'operational',
    metrics: { powerUsage: 450, temperature: 24, humidity: 45, serverLoad: 62, pue: 1.45, occupancy: 45 },
    lat: 18.7883,
    lng: 98.9853
  },
  {
    id: 'khonkaen',
    name: 'ขอนแก่น',
    region: 'Northeastern',
    coordinates: { x: 420, y: 180 },
    status: 'warning',
    metrics: { powerUsage: 520, temperature: 28, humidity: 55, serverLoad: 78, pue: 1.62, occupancy: 85 },
    lat: 16.4322,
    lng: 102.8236
  },
  {
    id: 'nonthaburi',
    name: 'นนทบุรี',
    region: 'Central',
    coordinates: { x: 260, y: 320 },
    status: 'operational',
    metrics: { powerUsage: 600, temperature: 22, humidity: 40, serverLoad: 55, pue: 1.38, occupancy: 30 },
    lat: 13.8583,
    lng: 100.5217
  },
  {
    id: 'bangrak',
    name: 'บางรัก',
    region: 'Central',
    coordinates: { x: 310, y: 340 },
    status: 'critical',
    metrics: { powerUsage: 890, temperature: 32, humidity: 60, serverLoad: 92, pue: 1.85, occupancy: 95 },
    lat: 13.7224,
    lng: 100.5159
  },
  {
    id: 'phrakhanong',
    name: 'พระโขนง',
    region: 'Central',
    coordinates: { x: 290, y: 360 },
    status: 'operational',
    metrics: { powerUsage: 550, temperature: 23, humidity: 42, serverLoad: 58, pue: 1.42, occupancy: 50 },
    lat: 13.7118,
    lng: 100.5962
  },
  {
    id: 'sriracha',
    name: 'ศรีราชา',
    region: 'Eastern',
    coordinates: { x: 360, y: 400 },
    status: 'operational',
    metrics: { powerUsage: 480, temperature: 25, humidity: 50, serverLoad: 65, pue: 1.50, occupancy: 40 },
    lat: 13.1736,
    lng: 100.9310
  },
  {
    id: 'suratthani',
    name: 'สุราษฎร์ธานี',
    region: 'Southern',
    coordinates: { x: 240, y: 550 },
    status: 'operational',
    metrics: { powerUsage: 420, temperature: 26, humidity: 58, serverLoad: 45, pue: 1.48, occupancy: 25 },
    lat: 9.1389,
    lng: 99.3236
  },
  {
    id: 'phuket',
    name: 'ภูเก็ต',
    region: 'Southern',
    coordinates: { x: 170, y: 620 },
    status: 'warning',
    metrics: { powerUsage: 510, temperature: 29, humidity: 65, serverLoad: 70, pue: 1.70, occupancy: 80 },
    lat: 7.8804,
    lng: 98.3923
  },
  {
    id: 'hatyai',
    name: 'หาดใหญ่',
    region: 'Southern',
    coordinates: { x: 280, y: 680 },
    status: 'operational',
    metrics: { powerUsage: 460, temperature: 25, humidity: 52, serverLoad: 60, pue: 1.44, occupancy: 55 },
    lat: 7.0084,
    lng: 100.4747
  }
];
