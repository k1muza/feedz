'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Globe, Users, File, TrafficCone, ArrowUpRight, Wifi, WifiOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

interface RealtimeData {
  activeUsers: number;
  topPages: Array<{
    page: string;
    users: number;
  }>;
}

interface TrafficSource {
  name: string;
  value: number;
  color: string;
}

interface TopPage {
  page: string;
  views: number;
}

interface Country {
  country: string;
  users: number;
}

export const AnalyticsDashboard = () => {
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
  const [trafficSources, setTrafficSources] = useState<TrafficSource[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<string>('');
  
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch static data (traffic sources, top pages, countries)
  useEffect(() => {
    const fetchStaticData = async () => {
      try {
        const [trafficRes, pagesRes, countriesRes] = await Promise.all([
          fetch('/api/analytics/traffic-sources'),
          fetch('/api/analytics/top-pages'),
          fetch('/api/analytics/countries'),
        ]);

        if (trafficRes.ok) {
          const trafficData = await trafficRes.json();
          if (trafficData.success) setTrafficSources(trafficData.data);
        }

        if (pagesRes.ok) {
          const pagesData = await pagesRes.json();
          if (pagesData.success) setTopPages(pagesData.data);
        }

        if (countriesRes.ok) {
          const countriesData = await countriesRes.json();
          if (countriesData.success) setCountries(countriesData.data);
        }

      } catch (err) {
        console.error('Error fetching static data:', err);
      }
    };

    fetchStaticData();
  }, []);

  // Set up Server-Sent Events for real-time data
  useEffect(() => {
    const connectToStream = () => {
      setConnectionStatus('connecting');
      
      const eventSource = new EventSource('/api/analytics/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        setConnectionStatus('connected');
        setError(null);
        setLoading(false);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'connected':
              console.log('Connected to analytics stream');
              break;
              
            case 'analytics-update':
              setRealtimeData(data.data);
              setLastUpdate(new Date(data.timestamp).toLocaleTimeString());
              break;
              
            case 'error':
              setError(data.message);
              break;
          }
        } catch (err) {
          console.error('Error parsing SSE data:', err);
        }
      };

      eventSource.onerror = (event) => {
        console.error('SSE connection error:', event);
        setConnectionStatus('disconnected');
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToStream();
          }
        }, 5000);
      };
    };

    connectToStream();

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 mb-8">
        <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading analytics data...</div>
        </div>
      </div>
    );
  }

  if (error && !realtimeData) {
    return (
      <div className="space-y-8 mb-8">
        <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-5">
          <p className="text-red-400">Error loading analytics: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-blue-400 hover:text-blue-300"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 mb-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            {connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : connectionStatus === 'connecting' ? (
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`${
              connectionStatus === 'connected' ? 'text-green-400' : 
              connectionStatus === 'connecting' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {connectionStatus === 'connected' ? 'Live' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Disconnected'}
            </span>
          </div>
          {lastUpdate && (
            <span className="text-gray-400">Last update: {lastUpdate}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Users */}
        <div className="lg:col-span-1 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-400 animate-ping' : 'bg-gray-400'
            }`}></div> 
            Real-time
          </h3>
          <div className="flex items-baseline gap-4">
            <p className="text-5xl font-bold text-green-400">
              {realtimeData?.activeUsers || 0}
            </p>
            <p className="text-gray-400">active users</p>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <p className="font-semibold text-gray-300">Top Active Pages:</p>
            {realtimeData?.topPages?.slice(0, 4).map((page, index) => (
              <div key={index} className="flex justify-between items-center text-gray-400">
                <span className="truncate" title={page.page}>
                  {page.page.length > 25 ? page.page.substring(0, 25) + '...' : page.page}
                </span>
                <span className="font-medium text-white">{page.users}</span>
              </div>
            ))}
            {(!realtimeData?.topPages || realtimeData.topPages.length === 0) && (
              <div className="text-gray-500">No active users on pages</div>
            )}
          </div>
        </div>

        {/* Traffic Sources & Top Pages */}
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <TrafficCone className="w-5 h-5 text-indigo-400"/> Traffic Sources
            </h3>
            <div className="h-48">
              {trafficSources.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={trafficSources} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={40} 
                      outerRadius={60} 
                      fill="#8884d8" 
                      paddingAngle={5}
                    >
                      {trafficSources.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#1f2937', 
                        border: '1px solid #374151', 
                        borderRadius: '0.5rem'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No traffic source data
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <File className="w-5 h-5 text-indigo-400"/> Top Pages (Last 7 Days)
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-gray-400 font-medium">
                <p>Page</p><p>Views</p>
              </div>
              {topPages.slice(0, 6).map((page, index) => (
                <div key={index} className="flex justify-between items-center text-gray-400 hover:bg-gray-800 p-1 rounded-md">
                  <span className="truncate" title={page.page}>
                    {page.page.length > 20 ? page.page.substring(0, 20) + '...' : page.page}
                  </span>
                  <span className="font-medium text-white">{page.views.toLocaleString()}</span>
                </div>
              ))}
              {topPages.length === 0 && (
                <div className="text-gray-500">No page data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Users by Country */}
      <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-indigo-400"/> Users by Country
        </h3>
        <div className="h-72">
          {countries.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={countries.slice(0, 6)} 
                layout="vertical" 
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#ccc', fontSize: 12 }} />
                <YAxis 
                  type="category" 
                  dataKey="country" 
                  tick={{ fill: '#ccc', fontSize: 12 }} 
                  width={80} 
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151', 
                    borderRadius: '0.5rem'
                  }} 
                  cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }}
                />
                <Bar dataKey="users" fill="#8884d8" barSize={20}>
                  {countries.slice(0, 6).map((entry, index) => {
                    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe', '#00c49f'];
                    return (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              No country data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
