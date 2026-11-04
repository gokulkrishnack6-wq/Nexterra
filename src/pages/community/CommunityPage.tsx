import React from 'react';
import { 
  Users, 
  Check, 
  BookOpen, 
  ArrowRight
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';

export const CommunityPage: React.FC = () => {
  const { challenges, joinChallenge } = useData();

  const guides = [
    {
      title: 'Aerobic Composting in Kerala’s Monsoons',
      category: 'Soil Amendment',
      readTime: '4 min read',
      summary: 'Prevent waterlogging and anaerobic odors in high-humidity weather using dry coconut coir bedding and EM cultures.',
    },
    {
      title: 'Haritha Karma Sena Doorstep Collection Guide',
      category: 'Local Governance',
      readTime: '3 min read',
      summary: 'How Kudumbashree green units coordinate monthly dry non-biodegradable segregation and delivery to MCFs.',
    },
    {
      title: 'Safe E-Waste Segregation & Coastal Aquifers',
      category: 'Resource Protection',
      readTime: '5 min read',
      summary: 'Understanding toxic metal leaching risks and how certified secondary smelting protects our water tables.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Header */}
      <div className="max-w-xl space-y-1">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-forest">
          Community Initiatives
        </h1>
        <p className="text-xs sm:text-sm text-charcoal-muted leading-relaxed">
          Collective waste diversion challenges, campus collections, and practical circular guides for Kerala communities.
        </p>
      </div>

      {/* Active Challenges */}
      <div className="space-y-4">
        <h2 className="font-heading font-bold text-lg text-charcoal">
          Active Diversion Challenges
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {challenges.map((challenge) => {
            const percentage = Math.min(
              Math.round((challenge.current_kg / challenge.target_kg) * 100),
              100
            );

            return (
              <div
                key={challenge.id}
                className="bg-white rounded-lg border border-[#E2E2D8] flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="aspect-[16/9] w-full bg-[#EFEFE6]">
                    <img
                      src={challenge.banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                      alt={challenge.title}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-charcoal-muted">
                      <span>{challenge.district}</span>
                      <span className="font-semibold text-forest">+{challenge.reward_points} pts</span>
                    </div>

                    <h3 className="font-heading font-semibold text-sm text-charcoal leading-snug">
                      {challenge.title}
                    </h3>

                    <p className="text-xs text-charcoal-muted line-clamp-3 leading-relaxed">
                      {challenge.description}
                    </p>

                    {/* Progress Bar */}
                    <div className="space-y-1 pt-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-charcoal">{challenge.current_kg} kg collected</span>
                        <span className="text-charcoal-muted">{challenge.target_kg} kg</span>
                      </div>
                      <div className="w-full bg-[#EFEFE6] rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-forest h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  {challenge.is_participating ? (
                    <div className="p-2 bg-cream text-forest text-xs rounded border border-[#E2E2D8] flex items-center justify-center gap-1.5 font-medium">
                      <Check className="w-3.5 h-3.5" />
                      <span>Participating</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => joinChallenge(challenge.id)}
                      className="w-full py-2 bg-cream hover:bg-[#EBEBE0] text-charcoal font-medium text-xs rounded border border-[#D5D5CA] transition-colors"
                    >
                      Join Challenge
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Practical Articles */}
      <div className="space-y-4 pt-2">
        <h2 className="font-heading font-bold text-lg text-charcoal">
          Practical Guides for Kerala
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {guides.map((guide, idx) => (
            <div
              key={idx}
              className="bg-white p-5 rounded-lg border border-[#E2E2D8] flex flex-col justify-between space-y-3 text-xs"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-charcoal-muted">
                  <span className="text-forest font-medium">{guide.category}</span>
                  <span>{guide.readTime}</span>
                </div>
                <h3 className="font-heading font-semibold text-sm text-charcoal leading-snug">
                  {guide.title}
                </h3>
                <p className="text-charcoal-muted leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-[#F0F0E6]">
                <span className="text-forest hover:underline font-medium inline-flex items-center gap-1 cursor-pointer">
                  <span>Read Guide</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
