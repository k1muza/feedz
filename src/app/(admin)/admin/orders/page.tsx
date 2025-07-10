
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

export default function OrdersPage() {
    const orders = [
        { id: 'ORD001', customer: 'John Doe', date: '2024-05-01', total: '$150.00', status: 'Shipped' },
        { id: 'ORD002', customer: 'Jane Smith', date: '2024-05-02', total: '$250.50', status: 'Processing' },
        { id: 'ORD003', customer: 'Sam Wilson', date: '2024-05-03', total: '$75.25', status: 'Delivered' },
        { id: 'ORD004', customer: 'Alice Brown', date: '2024-05-04', total: '$300.00', status: 'Pending' },
        { id: 'ORD005', customer: 'Bob Johnson', date: '2024-05-05', total: '$500.75', status: 'Cancelled' },
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Shipped':
                return <Badge variant="secondary">{status}</Badge>;
            case 'Processing':
                return <Badge variant="default">{status}</Badge>;
            case 'Delivered':
                return <Badge className="bg-green-500 text-white">{status}</Badge>;
            case 'Pending':
                return <Badge variant="outline">{status}</Badge>;
            case 'Cancelled':
                return <Badge variant="destructive">{status}</Badge>;
            default:
                return <Badge>{status}</Badge>;
        }
    }

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
            <Card>
                <CardHeader>
                    <CardTitle>Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>{order.id}</TableCell>
                                    <TableCell>{order.customer}</TableCell>
                                    <TableCell>{order.date}</TableCell>
                                    <TableCell>{order.total}</TableCell>
                                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
