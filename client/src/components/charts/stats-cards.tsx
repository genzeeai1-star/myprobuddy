import { TrendingUp, TrendingDown, Users, Store, BarChart3, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  stats?: {
    totalPartners: number;
    activeLeads: number;
    conversionRate: string;
    revenue: string;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Partners",
      value: stats?.totalPartners || 0,
      icon: Store,
      color: "bg-blue-500",
      change: "+12%",
      isPositive: true,
    },
    {
      title: "Active Leads",
      value: stats?.activeLeads || 0,
      icon: Users,
      color: "bg-green-500",
      change: "+8%",
      isPositive: true,
    },
    {
      title: "Conversion Rate",
      value: `${stats?.conversionRate || "0.0"}%`,
      icon: BarChart3,
      color: "bg-purple-500",
      change: "-2%",
      isPositive: false,
    },
    {
      title: "Revenue Generated",
      value: `₹${stats?.revenue || "0"}`,
      icon: DollarSign,
      color: "bg-orange-500",
      change: "+18%",
      isPositive: true,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        const gradients = [
          "from-indigo-500 to-purple-500",
          "from-emerald-500 to-teal-500", 
          "from-violet-500 to-fuchsia-500",
          "from-amber-500 to-orange-500"
        ];
        const bgGradients = [
          "from-blue-100 to-indigo-100",
          "from-emerald-100 to-teal-100",
          "from-violet-100 to-fuchsia-100", 
          "from-amber-100 to-orange-100"
        ];
        
        return (
          <Card key={index} className={`bg-gradient-to-br ${bgGradients[index]} rounded-xl shadow-lg border border-slate-300 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 backdrop-blur-sm`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-800 mt-2" data-testid={`stat-${card.title.toLowerCase().replace(/\s+/g, '-')}`}>
                    {card.value}
                  </p>
                </div>
                <div className={`w-14 h-14 bg-gradient-to-r ${gradients[index]} rounded-xl flex items-center justify-center shadow-lg`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm">
                  <span className={`flex items-center font-medium ${card.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {card.isPositive ? (
                      <TrendingUp className="w-4 h-4 mr-1" />
                    ) : (
                      <TrendingDown className="w-4 h-4 mr-1" />
                    )}
                    {card.change}
                  </span>
                  <span className="text-slate-500 ml-2">vs last month</span>
                </div>
                <div className={`w-2 h-2 rounded-full ${card.isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
