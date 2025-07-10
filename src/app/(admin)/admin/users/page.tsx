
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function UsersPage() {
    const users = [
        { id: 1, name: 'John Doe', email: 'john.d@example.com', role: 'Admin', avatar: '/images/authors/doctor.png' },
        { id: 2, name: 'Jane Smith', email: 'jane.s@example.com', role: 'User', avatar: '/images/authors/tech-expert.jpg' },
        { id: 3, name: 'Sam Wilson', email: 'sam.w@example.com', role: 'User', avatar: '/images/authors/economist.jpg' },
        { id: 4, name: 'Alice Brown', email: 'alice.b@example.com', role: 'Editor', avatar: '/images/authors/feed-expert.jpg' },
    ];

    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Users</h2>
            <Card>
                <CardHeader>
                    <CardTitle>User Management</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={user.avatar} alt={user.name} />
                                                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="font-medium">{user.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === 'Admin' ? 'destructive' : 'secondary'}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
