
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Globe, Users, File, TrafficCone, ArrowUpRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const realtimeUsersData = {
  total: 42,
  pages: [
    { page: '/', users: 15 },
    { page: '/products/123', users: 8 },
    { page: '/blog/ai-in-nutrition', users: 6 },
    { page: '/contact', users: 5 },
    { page: '/about', users: 4 },
    { page: 'other', users: 4 },
  ],
};

const trafficSourceData = [
  { name: 'Direct', value: 400, color: '#8884d8' },
  { name: 'Organic Search', value: 300, color: '#82ca9d' },
  { name: 'Referral', value: 300, color: '#ffc658' },
  { name: 'Social', value: 200, color: '#ff8042' },
];

const usersByCountryData = [
  { country: 'USA', users: 4500 },
  { country: 'India', users: 2800 },
  { country: 'Brazil', users: 1800 },
  { country: 'UK', users: 1500 },
  { country: 'Germany', users: 1100 },
  { country: 'Canada', users: 950 },
];

export const AnalyticsDashboard = () => {
    const [realtimeCount, setRealtimeCount] = useState(realtimeUsersData.total);

    useEffect(() => {
        const interval = setInterval(() => {
            setRealtimeCount(prev => {
                const change = Math.floor(Math.random() * 5) - 2; // -2 to +2
                return Math.max(20, prev + change); // Keep it above a minimum
            });
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="space-y-8 mb-8">
            <h2 className="text-2xl font-bold text-white">Analytics Overview</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Real-time Users */}
                <div className="lg:col-span-1 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                       <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div> Real-time
                    </h3>
                    <div className="flex items-baseline gap-4">
                        <p className="text-5xl font-bold text-green-400">{realtimeCount}</p>
                        <p className="text-gray-400">active users</p>
                    </div>
                     <div className="mt-4 space-y-2 text-sm">
                        <p className="font-semibold text-gray-300">Top Active Pages:</p>
                        {realtimeUsersData.pages.slice(0, 4).map(p => (
                             <div key={p.page} className="flex justify-between items-center text-gray-400">
                                <span className="truncate">{p.page}</span>
                                <span className="font-medium text-white">{p.users}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Traffic Sources & Top Pages */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                           <TrafficCone className="w-5 h-5 text-indigo-400"/> Traffic Sources
                        </h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                <Pie data={trafficSourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} fill="#8884d8" paddingAngle={5}>
                                    {trafficSourceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem'}}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                   </div>
                    <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                           <File className="w-5 h-5 text-indigo-400"/> Top Pages (Last 7 Days)
                        </h3>
                         <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-400 font-medium"><p>Page</p><p>Views</p></div>
                            {realtimeUsersData.pages.map(p => (
                                <div key={p.page} className="flex justify-between items-center text-gray-400 hover:bg-gray-800 p-1 rounded-md">
                                    <span className="truncate">{p.page}</span>
                                    <span className="font-medium text-white">{(p.users * 150).toLocaleString()}</span>
                                </div>
                            ))}
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
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={usersByCountryData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#444" horizontal={false} />
                            <XAxis type="number" tick={{ fill: '#ccc', fontSize: 12 }} />
                            <YAxis type="category" dataKey="country" tick={{ fill: '#ccc', fontSize: 12 }} width={80} />
                            <Tooltip contentStyle={{backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem'}} cursor={{ fill: 'rgba(129, 140, 248, 0.1)' }}/>
                            <Bar dataKey="users" fill="#8884d8" barSize={20}>
                                 {usersByCountryData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={trafficSourceData[index % trafficSourceData.length].color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                 </div>
            </div>
        </div>
    );
};
