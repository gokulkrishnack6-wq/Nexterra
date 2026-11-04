import React from 'react';
import { 
  Users, 
  Flame, 
  CheckCircle2, 
  Trophy, 
  BookOpen, 
  Sparkles, 
  ArrowRight, 
  MapPin, 
  Calendar 
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { useAuth } from '../../contexts/AuthContext';

export const CommunityPage: React.FC = () => {
  const { challenges, joinChallenge } = useData();
  const { currentUser } = useAuth();

  const guides = [
    {
      title: 'Aerobic Composting in Kerala’s Monsoons',
      category: 'Organic Soil Care',
      readTime: '4 min read',
      summary: 'Prevent waterlogging and anaerobic odor in wet weather using dry coconut coir bedding and effective microorganism (EM) culture.',
    },
    {
      title: 'Understanding Haritha Karma Sena Doorstep Segregation',
      category: 'Municipal Framework',
      readTime: '3 min read',
      summary: 'How Kerala’s Kudumbashree green army coordinates monthly non-biodegradable collection and material recovery facilities.',
    },
    {
      title: 'E-Waste Hazards: Why Burn Pits Destroy Kerala Water Tables',
      category: 'Pollution Prevention',
      readTime: '5 min read',
      summary: 'Heavy metal leaching risks from lead, cadmium, and mercury, and how certified secondary smelting protects our coastal aquifers.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-lime/30 text-forest-dark border border-lime/40 px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2">
            <Users className="w-3.5 h-3.5 text-forest" /> Collective Grassroots Action
          </div>
          <h1 className="font-heading font-extrabold text-3xl text-forest-dark">
            Community Sustainability Hub
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Participate in campus challenges, regional zero-waste campaigns, and learn practical waste upcycling.
          </p>
        </div>
      </div>

      {/* Active Challenges Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <h2 className="font-heading font-extrabold text-xl text-forest-dark">
              Active Regional Challenges
            </h2>
          </div>
          <span className="text-xs text-slate-500">Compete & earn bonus EcoPoints</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge) => {
            const percentage = Math.min(
              Math.round((challenge.current_kg / challenge.target_kg) * 100),
              100
            );

            return (
              <div
                key={challenge.id}
                className="bg-white rounded-3xl border border-sage/40 shadow-soft overflow-hidden flex flex-col justify-between group hover:shadow-elevated transition-all"
              >
                <div>
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img
                      src={challenge.banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                      alt={challenge.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-forest text-lime font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase shadow">
                      {challenge.district}
                    </div>
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur text-forest font-black text-xs px-2.5 py-0.5 rounded-full shadow">
                      +{challenge.reward_points} PTS
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-heading font-bold text-base text-forest-dark leading-snug">
                      {challenge.title}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                      {challenge.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1.5 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-forest-dark">{challenge.current_kg} kg collected</span>
                        <span className="text-slate-400">Target: {challenge.target_kg} kg</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-forest h-2.5 rounded-full transition-all duration-1000"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-right block text-forest font-bold">
                        {percentage}% Completed
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0">
                  {challenge.is_participating ? (
                    <div className="p-2.5 bg-sage-light text-forest font-bold text-xs rounded-xl flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-forest" />
                      <span>Participating ({challenge.user_progress_kg} kg contributed)</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full py-2.5 bg-forest hover:bg-forest-dark text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-4 h-4 text-lime" />
                      <span>Join This Challenge</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Circular Knowledge & Action Guides */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-forest" />
          <h2 className="font-heading font-extrabold text-xl text-forest-dark">
            Circular Economy Guides for Kerala
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {guides.map((guide, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-3xl border border-sage/40 shadow-soft flex flex-col justify-between space-y-4 hover:border-forest transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-forest">
                  <span className="bg-sage-light px-2 py-0.5 rounded">{guide.category}</span>
                  <span className="text-slate-400">{guide.readTime}</span>
                </div>
                <h3 className="font-heading font-bold text-base text-forest-dark leading-snug">
                  {guide.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold text-forest hover:underline inline-flex items-center gap-1 cursor-pointer">
                  <span>Read Full Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
