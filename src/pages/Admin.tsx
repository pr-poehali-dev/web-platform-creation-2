import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ADMIN_API = 'https://functions.poehali.dev/bab611c3-4642-490a-a83e-85f67fd41bb5';
const AUTH_API = 'https://functions.poehali.dev/2abe086a-57e0-45bb-87f5-702189437488';

export default function Admin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState('');
  
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    totalWithdrawals: 0,
    totalTopups: 0,
    totalReferrals: 0
  });
  
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusType, setBonusType] = useState('card_bonus');
  const [bonusDescription, setBonusDescription] = useState('');

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    const telegramUser = localStorage.getItem('telegramUser');
    
    if (!storedUserId || !telegramUser) {
      toast.error('Войдите через Telegram');
      navigate('/');
      return;
    }
    
    setUserId(storedUserId);
    checkAdminAccess(storedUserId);
  }, [navigate]);

  const checkAdminAccess = async (uid: string) => {
    try {
      const response = await fetch(AUTH_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check_admin', userId: uid })
      });
      
      const data = await response.json();
      
      if (!data.isAdmin) {
        toast.error('Доступ запрещен');
        navigate('/');
        return;
      }
      
      setIsAdmin(true);
      fetchStats();
      fetchUsers();
      fetchTransactions();
    } catch (error) {
      toast.error('Ошибка проверки прав');
      navigate('/');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${ADMIN_API}?action=stats`, {
        headers: { 'X-Admin-Id': userId || localStorage.getItem('userId') || '' }
      });
      const data = await response.json();
      setStats(data);
    } catch (error) {
      toast.error('Ошибка загрузки статистики');
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`${ADMIN_API}?action=users&limit=100`, {
        headers: { 'X-Admin-Id': userId || localStorage.getItem('userId') || '' }
      });
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      toast.error('Ошибка загрузки пользователей');
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${ADMIN_API}?action=transactions&limit=100`, {
        headers: { 'X-Admin-Id': userId || localStorage.getItem('userId') || '' }
      });
      const data = await response.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      toast.error('Ошибка загрузки транзакций');
    }
  };

  const handleAddBonus = async () => {
    if (!selectedUser || !bonusAmount) {
      toast.error('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(ADMIN_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Id': userId
        },
        body: JSON.stringify({
          action: 'add_bonus',
          userId: selectedUser.user_id,
          amount: Number(bonusAmount),
          type: bonusType,
          description: bonusDescription || 'Бонус от администратора'
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Бонус начислен!');
        setBonusAmount('');
        setBonusDescription('');
        setSelectedUser(null);
        fetchStats();
        fetchUsers();
        fetchTransactions();
      } else {
        toast.error(data.error || 'Ошибка');
      }
    } catch (error) {
      toast.error('Ошибка начисления бонуса');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-primary/10 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Проверка доступа...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10">
      <div className="container mx-auto px-4 py-6">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              Админ-панель 🔒
            </h1>
            <p className="text-muted-foreground text-sm">Управление платформой</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')}>
            <Icon name="Home" size={20} className="mr-2" />
            На главную
          </Button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Пользователей</CardDescription>
              <CardTitle className="text-3xl text-primary">{stats.totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <CardDescription>Общий баланс</CardDescription>
              <CardTitle className="text-3xl text-accent">{stats.totalBalance} ₽</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="border-secondary/20">
            <CardHeader className="pb-3">
              <CardDescription>Выводов</CardDescription>
              <CardTitle className="text-3xl text-secondary">{stats.totalWithdrawals}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardDescription>Пополнений</CardDescription>
              <CardTitle className="text-3xl text-primary">{stats.totalTopups}</CardTitle>
            </CardHeader>
          </Card>
          
          <Card className="border-accent/20">
            <CardHeader className="pb-3">
              <CardDescription>Рефералов</CardDescription>
              <CardTitle className="text-3xl text-accent">{stats.totalReferrals}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="users">Пользователи</TabsTrigger>
            <TabsTrigger value="transactions">Транзакции</TabsTrigger>
            <TabsTrigger value="bonuses">Бонусы</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>Все пользователи</CardTitle>
                <CardDescription>Список зарегистрированных пользователей</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Имя</TableHead>
                      <TableHead>Баланс</TableHead>
                      <TableHead>С карт</TableHead>
                      <TableHead>С рефералов</TableHead>
                      <TableHead>Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-mono text-xs">{user.user_id}</TableCell>
                        <TableCell>{user.first_name || user.user_id}</TableCell>
                        <TableCell className="font-semibold">{parseFloat(user.balance).toFixed(2)} ₽</TableCell>
                        <TableCell>{parseFloat(user.card_earnings).toFixed(2)} ₽</TableCell>
                        <TableCell>{parseFloat(user.referral_earnings).toFixed(2)} ₽</TableCell>
                        <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle>Все транзакции</CardTitle>
                <CardDescription>История операций платформы</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Пользователь</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Сумма</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Дата</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-xs">{tx.user_id}</TableCell>
                        <TableCell>
                          {tx.type === 'withdraw' && '📤 Вывод'}
                          {tx.type === 'topup' && '📥 Пополнение'}
                          {tx.type === 'card_bonus' && '💳 Бонус за карту'}
                          {tx.type === 'referral_bonus' && '👥 Реферальный'}
                        </TableCell>
                        <TableCell className="font-semibold">{parseFloat(tx.amount).toFixed(2)} ₽</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${
                            tx.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {tx.status}
                          </span>
                        </TableCell>
                        <TableCell>{new Date(tx.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bonuses">
            <Card>
              <CardHeader>
                <CardTitle>Начисление бонусов</CardTitle>
                <CardDescription>Добавьте бонусы пользователям вручную</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Выберите пользователя</Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {selectedUser ? `${selectedUser.first_name || selectedUser.user_id}` : 'Выбрать пользователя'}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-h-[500px] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Выберите пользователя</DialogTitle>
                        <DialogDescription>Кому начислить бонус?</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-2">
                        {users.map((user) => (
                          <Button
                            key={user.id}
                            variant="outline"
                            className="w-full justify-start"
                            onClick={() => setSelectedUser(user)}
                          >
                            <div className="flex flex-col items-start">
                              <span>{user.first_name || user.user_id}</span>
                              <span className="text-xs text-muted-foreground">Баланс: {parseFloat(user.balance).toFixed(2)} ₽</span>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="space-y-2">
                  <Label>Тип бонуса</Label>
                  <Select value={bonusType} onValueChange={setBonusType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="card_bonus">💳 Бонус за карту</SelectItem>
                      <SelectItem value="referral_bonus">👥 Реферальный бонус</SelectItem>
                      <SelectItem value="admin_bonus">⭐ Бонус от админа</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Сумма бонуса</Label>
                  <Input
                    type="number"
                    placeholder="500"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Описание (необязательно)</Label>
                  <Input
                    placeholder="За отличную работу"
                    value={bonusDescription}
                    onChange={(e) => setBonusDescription(e.target.value)}
                  />
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary"
                  onClick={handleAddBonus}
                  disabled={loading || !selectedUser || !bonusAmount}
                >
                  {loading ? 'Обработка...' : 'Начислить бонус'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
