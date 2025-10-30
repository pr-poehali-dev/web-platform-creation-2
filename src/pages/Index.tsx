import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Icon from '@/components/ui/icon';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const API_URL = 'https://functions.poehali.dev/4ee0098d-e446-453c-a5c1-294b06ce09f1';

export default function Index() {
  const [activeTab, setActiveTab] = useState('card');
  const [balance, setBalance] = useState(0);
  const [cardEarnings, setCardEarnings] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);
  const [menuSection, setMenuSection] = useState('');
  const [userId] = useState(() => {
    const stored = localStorage.getItem('userId');
    if (stored) return stored;
    const newId = 'USER' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('userId', newId);
    return newId;
  });
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawBank, setWithdrawBank] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const referralLink = `https://alfacard.poehali.dev/ref/${userId}`;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await fetch(`${API_URL}?userId=${userId}`);
      const data = await response.json();
      
      if (data.user) {
        setBalance(parseFloat(data.user.balance));
        setCardEarnings(parseFloat(data.user.card_earnings));
        setReferralEarnings(parseFloat(data.user.referral_earnings));
        setReferralCount(data.referralCount || 0);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Ошибка загрузки данных');
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawPhone || !withdrawBank) {
      toast.error('Заполните все поля');
      return;
    }
    if (Number(withdrawAmount) > balance) {
      toast.error('Недостаточно средств');
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'withdraw',
          userId,
          amount: Number(withdrawAmount),
          phone: withdrawPhone,
          bank: withdrawBank
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Заявка на вывод отправлена!');
        await fetchUserData();
        setWithdrawAmount('');
        setWithdrawPhone('');
        setWithdrawBank('');
      } else {
        toast.error(data.error || 'Ошибка вывода');
      }
    } catch (error) {
      toast.error('Ошибка при выводе средств');
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!topupAmount) {
      toast.error('Укажите сумму пополнения');
      return;
    }
    
    toast.info('Переведите ' + topupAmount + ' ₽ на номер 89069892267. У вас 5 минут.');
    
    setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'topup',
            userId,
            amount: Number(topupAmount)
          })
        });
        
        const data = await response.json();
        
        if (data.success) {
          toast.success('Баланс пополнен на ' + topupAmount + ' ₽');
          await fetchUserData();
          setTopupAmount('');
        } else {
          toast.error(data.error || 'Ошибка пополнения');
        }
      } catch (error) {
        toast.error('Ошибка при пополнении');
      } finally {
        setLoading(false);
      }
    }, 3000);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано в буфер обмена!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(155,135,245,0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(217,70,239,0.1),transparent_50%)]"></div>
      
      <div className="relative z-10 container mx-auto px-4 py-6 pb-28">
        <header className="flex justify-between items-center mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              АльфаБонус 💎
            </h1>
            <p className="text-muted-foreground text-sm">Зарабатывай на картах</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full border-primary/20 hover:border-primary/50 transition-all"
            onClick={() => setShowMenu(!showMenu)}
          >
            <Icon name="Menu" size={24} />
          </Button>
        </header>

        <div className="animate-slide-up">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsContent value="card" className="mt-0">
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm animate-scale-in">
                <CardHeader>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Icon name="CreditCard" size={28} className="text-primary" />
                    Оформи карту — получи 1000 ₽
                  </CardTitle>
                  <CardDescription className="text-base">
                    Отличное предложение от нас и Альфа-Банка! 🌟
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl p-6 space-y-4 border border-primary/30">
                    <div className="text-center space-y-2">
                      <p className="text-4xl font-bold">1000 ₽</p>
                      <p className="text-muted-foreground">500 ₽ от нас + 500 ₽ от банка</p>
                    </div>
                    
                    <div className="space-y-3 text-sm">
                      <p className="font-semibold">📋 Что нужно сделать?</p>
                      <ol className="space-y-2 list-decimal list-inside">
                        <li>Оформить Альфа-Карту по ссылке ниже</li>
                        <li>Активировать карту в приложении</li>
                        <li>Сделать покупку от 200 ₽</li>
                        <li>Отправить чек для выплаты 500 ₽</li>
                      </ol>
                    </div>

                    <div className="space-y-2">
                      <Button 
                        className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition-all"
                        size="lg"
                        onClick={() => window.open('https://alfa.me/ASQWHN', '_blank')}
                      >
                        <Icon name="ExternalLink" size={20} className="mr-2" />
                        Оформить Альфа-Карту
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full border-primary/30"
                        onClick={() => window.open('https://t.me/Alfa_Bank778', '_blank')}
                      >
                        <Icon name="Send" size={20} className="mr-2" />
                        Отправить чек в Telegram
                      </Button>
                    </div>
                  </div>

                  <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
                    <p className="text-sm">
                      <strong>💳 Преимущества карты:</strong><br />
                      Бесплатное обслуживание • Кэшбэк каждый месяц • Партнёрские предложения ❤️
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="balance" className="mt-0">
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Wallet" size={28} className="text-accent" />
                    Ваш баланс
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gradient-to-br from-accent/20 to-primary/20 rounded-2xl p-8 text-center border border-accent/30">
                    <p className="text-muted-foreground mb-2">Доступно для вывода</p>
                    <p className="text-6xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      {balance} ₽
                    </p>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/20 p-2 rounded-full">
                          <Icon name="CreditCard" size={20} className="text-primary" />
                        </div>
                        <span className="text-sm">Заработок с карт</span>
                      </div>
                      <span className="font-semibold">{cardEarnings} ₽</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-secondary/20 p-2 rounded-full">
                          <Icon name="Users" size={20} className="text-secondary" />
                        </div>
                        <span className="text-sm">Реферальная программа</span>
                      </div>
                      <span className="font-semibold">{referralEarnings} ₽</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="referral" className="mt-0">
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="Users" size={28} className="text-secondary" />
                    Реферальная программа
                  </CardTitle>
                  <CardDescription>Приглашай друзей и зарабатывай!</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-secondary/20 to-primary/20 rounded-xl p-6 border border-secondary/30">
                    <p className="text-center text-3xl font-bold mb-2">200 ₽</p>
                    <p className="text-center text-sm text-muted-foreground">
                      За каждого друга, который закажет карту
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Ваша реферальная ссылка</Label>
                    <div className="flex gap-2">
                      <Input value={referralLink} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(referralLink)}
                      >
                        <Icon name="Copy" size={20} />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                    <p className="font-semibold text-sm">📊 Ваша статистика:</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-bold text-primary">{referralCount}</p>
                        <p className="text-xs text-muted-foreground">Приглашено друзей</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-secondary">{referralEarnings} ₽</p>
                        <p className="text-xs text-muted-foreground">Заработано</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="withdraw" className="mt-0">
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="ArrowUpRight" size={28} className="text-accent" />
                    Вывод средств
                  </CardTitle>
                  <CardDescription>Выводите через СБП на любой банк</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Сумма вывода</Label>
                    <Input
                      id="withdraw-amount"
                      type="number"
                      placeholder="500"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Доступно: {balance} ₽
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="withdraw-phone">Номер телефона</Label>
                    <Input
                      id="withdraw-phone"
                      type="tel"
                      placeholder="+7 900 123 45 67"
                      value={withdrawPhone}
                      onChange={(e) => setWithdrawPhone(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="withdraw-bank">Банк</Label>
                    <Select value={withdrawBank} onValueChange={setWithdrawBank}>
                      <SelectTrigger id="withdraw-bank">
                        <SelectValue placeholder="Выберите банк" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sber">Сбербанк</SelectItem>
                        <SelectItem value="tinkoff">Тинькофф</SelectItem>
                        <SelectItem value="alfa">Альфа-Банк</SelectItem>
                        <SelectItem value="vtb">ВТБ</SelectItem>
                        <SelectItem value="raif">Райффайзен</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-accent to-primary"
                    size="lg"
                    onClick={handleWithdraw}
                    disabled={loading}
                  >
                    {loading ? 'Обработка...' : 'Вывести средства'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topup" className="mt-0">
              <Card className="border-primary/20 bg-card/50 backdrop-blur-sm animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon name="ArrowDownLeft" size={28} className="text-primary" />
                    Пополнение баланса
                  </CardTitle>
                  <CardDescription>Пополняйте через СБП</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl p-6 border border-primary/30">
                    <p className="text-center text-sm text-muted-foreground mb-2">
                      Переведите на номер
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <p className="text-2xl font-bold font-mono">89069892267</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard('89069892267')}
                      >
                        <Icon name="Copy" size={20} />
                      </Button>
                    </div>
                    <p className="text-center text-xs text-muted-foreground mt-2">
                      ⏱ Срок для пополнения: 5 минут
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="topup-amount">Сумма пополнения</Label>
                    <Input
                      id="topup-amount"
                      type="number"
                      placeholder="1000"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                    />
                  </div>

                  <Button
                    className="w-full bg-gradient-to-r from-primary to-secondary"
                    size="lg"
                    onClick={handleTopup}
                    disabled={loading}
                  >
                    {loading ? 'Обработка...' : 'Я перевёл средства'}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-border z-50">
        <TabsList className="w-full h-auto grid grid-cols-5 bg-transparent p-2 gap-1">
          <TabsTrigger
            value="card"
            className="flex-col gap-1 h-16 data-[state=active]:bg-primary/20"
            onClick={() => setActiveTab('card')}
          >
            <Icon name="CreditCard" size={24} />
            <span className="text-xs">Карта</span>
          </TabsTrigger>
          <TabsTrigger
            value="balance"
            className="flex-col gap-1 h-16 data-[state=active]:bg-accent/20"
            onClick={() => setActiveTab('balance')}
          >
            <Icon name="Wallet" size={24} />
            <span className="text-xs">Баланс</span>
          </TabsTrigger>
          <TabsTrigger
            value="referral"
            className="flex-col gap-1 h-16 data-[state=active]:bg-secondary/20"
            onClick={() => setActiveTab('referral')}
          >
            <Icon name="Users" size={24} />
            <span className="text-xs">Рефералы</span>
          </TabsTrigger>
          <TabsTrigger
            value="withdraw"
            className="flex-col gap-1 h-16 data-[state=active]:bg-accent/20"
            onClick={() => setActiveTab('withdraw')}
          >
            <Icon name="ArrowUpRight" size={24} />
            <span className="text-xs">Вывод</span>
          </TabsTrigger>
          <TabsTrigger
            value="topup"
            className="flex-col gap-1 h-16 data-[state=active]:bg-primary/20"
            onClick={() => setActiveTab('topup')}
          >
            <Icon name="ArrowDownLeft" size={24} />
            <span className="text-xs">Пополнить</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <Dialog open={showMenu} onOpenChange={setShowMenu}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Меню</DialogTitle>
            <DialogDescription>Выберите раздел</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setMenuSection('support');
                toast.info('Напишите нам: support@alfabonus.ru');
              }}
            >
              <Icon name="MessageCircle" size={20} className="mr-2" />
              Техподдержка
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setMenuSection('partnership');
                toast.info('По вопросам сотрудничества: partners@alfabonus.ru');
              }}
            >
              <Icon name="Handshake" size={20} className="mr-2" />
              Сотрудничество
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setMenuSection('boost');
                toast.info('Раздел накрутки в разработке 🚀');
              }}
            >
              <Icon name="TrendingUp" size={20} className="mr-2" />
              Накрутка
            </Button>
            <Button
              variant="outline"
              className="justify-start"
              onClick={() => {
                setMenuSection('admin');
                toast.info('Админ-панель в разработке 🔒');
              }}
            >
              <Icon name="Shield" size={20} className="mr-2" />
              Управление
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}