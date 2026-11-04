import React from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { SustainabilityMetrics } from '../../types';

interface ImpactChartsProps {
  metrics: SustainabilityMetrics;
}

const PALETTE = ['#174D36', '#B6D96B', '#A8C5A2', '#216347', '#D4E7C5', '#F1B24A', '#4A90E2'];

export const ImpactCharts: React.FC<ImpactChartsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Category Diversion Breakdown */}
      <div className="bg-white p-6 rounded-2xl border border-sage/40 shadow-soft flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-heading font-bold text-base text-forest-dark">
              Material Diversion by Category
            </h3>
            <span className="text-xs bg-sage-light text-forest px-2.5 py-0.5 rounded-full font-bold">
              {metrics.total_waste_diverted_kg} kg Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Percentage share of waste streams diverted from landfills into circular reuse.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.category_breakdown}
                dataKey="diverted_kg"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
              >
                {metrics.category_breakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value} kg`, 'Diverted']}
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #A8C5A2', fontSize: '12px' }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Trend Growth */}
      <div className="bg-white p-6 rounded-2xl border border-sage/40 shadow-soft flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-heading font-bold text-base text-forest-dark">
              Monthly Waste & Carbon Savings (kg)
            </h3>
            <span className="text-xs bg-lime/40 text-forest-dark px-2.5 py-0.5 rounded-full font-bold">
              Cumulative Growth
            </span>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Verified monthly progression of diverted waste and avoided greenhouse gas emissions.
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E8F0E5" />
              <XAxis dataKey="month" stroke="#7A9E73" fontSize={11} tickLine={false} />
              <YAxis stroke="#7A9E73" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '0.75rem', border: '1px solid #A8C5A2', fontSize: '12px' }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
              />
              <Bar dataKey="diverted_kg" name="Waste Diverted (kg)" fill="#174D36" radius={[4, 4, 0, 0]} />
              <Bar dataKey="co2e_saved_kg" name="CO₂e Avoided (kg)" fill="#B6D96B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

