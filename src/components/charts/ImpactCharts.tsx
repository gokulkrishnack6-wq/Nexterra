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

const PALETTE = ['#234B35', '#A8B89F', '#526955', '#777E77', '#8EA385', '#3A5C47', '#A0AF99'];

export const ImpactCharts: React.FC<ImpactChartsProps> = ({ metrics }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Category Breakdown */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E2D8] flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-charcoal">
            Materials Diverted by Category
          </h3>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Share of waste streams diverted from landfills into secondary reuse.
          </p>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={metrics.category_breakdown}
                dataKey="diverted_kg"
                nameKey="category_name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {metrics.category_breakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [`${value} kg`, 'Diverted']}
                contentStyle={{ borderRadius: '6px', border: '1px solid #D5D5CA', fontSize: '11px', backgroundColor: '#FFFFFF' }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Trend Growth */}
      <div className="bg-white p-5 rounded-lg border border-[#E2E2D8] flex flex-col justify-between space-y-4">
        <div>
          <h3 className="font-heading font-semibold text-sm text-charcoal">
            Monthly Progress (kg)
          </h3>
          <p className="text-xs text-charcoal-muted mt-0.5">
            Verified monthly progression of diverted waste and avoided greenhouse gas emissions.
          </p>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={metrics.monthly_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EFEFE6" />
              <XAxis dataKey="month" stroke="#777E77" fontSize={11} tickLine={false} />
              <YAxis stroke="#777E77" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: '6px', border: '1px solid #D5D5CA', fontSize: '11px', backgroundColor: '#FFFFFF' }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              />
              <Bar dataKey="diverted_kg" name="Diverted (kg)" fill="#234B35" radius={[2, 2, 0, 0]} />
              <Bar dataKey="co2e_saved_kg" name="CO₂e Avoided (kg)" fill="#A8B89F" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
