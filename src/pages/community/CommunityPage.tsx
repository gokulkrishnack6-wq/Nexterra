import React from 'react';
import { 
  Users, 
  Check, 
  BookOpen, 
  ArrowRight,
  Award,
  Calendar
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/Skeleton';

export const CommunityPage: React.FC = () => {
  const { challenges, joinChallenge } = useData();

  const guides = [
    {
      title: 'Aerobic Composting in Kerala’s Monsoons',
      category: 'Soil Amendment',
      readTime: '4 min read',
      summary: 'Prevent waterlogging and anaerobic odors in high-humidity monsoon seasons using dry coconut coir dust bedding and microbial culture.',
    },
    {
      title: 'Haritha Karma Sena Doorstep Collection Protocol',
      category: 'Local Governance',
      readTime: '3 min read',
      summary: 'How Kudumbashree green units coordinate monthly dry non-biodegradable segregation and delivery to local MCF hubs.',
    },
    {
      title: 'Safe E-Waste Segregation & Coastal Aquifers',
      category: 'Resource Protection',
      readTime: '5 min read',
      summary: 'Understanding toxic heavy metal leaching risks into Vembanad Lake and how certified secondary smelting protects our coastal water tables.',
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-6 text-left">
      {/* Header */}
      <div className="border-b border-[#E8E4DA] pb-5 space-y-1">
        <h1 className="font-serif font-normal text-2xl sm:text-3xl text-[#103D2A] tracking-tight">
          Community Drives
        </h1>
        <p className="font-sans text-xs sm:text-sm text-[#5C6E66] max-w-xl">
          Join local waste collection drives, campus cleanups, and community initiatives across Kerala.
        </p>
      </div>

      {/* Active Challenges */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="font-sans font-medium text-base text-[#1C2826]">
            Active Diversion Challenges
          </h2>
          <span className="text-xs text-[#5C6E66]">Real-time kg Tracking</span>
        </div>

        {challenges.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-[#7B8B83]" />}
            title="No Active Community Challenges"
            description="There are currently no active community challenges in this area. Check back soon or propose a community collection drive with your local group."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {challenges.map((challenge) => {
              const percentage = Math.min(
                Math.round((challenge.current_kg / challenge.target_kg) * 100),
                100
              );

              return (
                <div
                  key={challenge.id}
                  className="flex flex-col justify-between overflow-hidden p-0 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all"
                >
                  <div>
                    <div className="aspect-[16/9] w-full bg-[#F4F1EA] relative">
                      <img
                        src={challenge.banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                        alt={challenge.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-[#103D2A] text-white px-2 py-0.5 rounded-md text-xs font-mono font-medium shadow-subtle">
                        +{challenge.reward_points} PTS
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-[#5C6E66]">
                        <span className="text-[11px] text-[#103D2A] bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md font-medium">{challenge.district} Drive</span>
                        <span className="text-xs text-[#5C6E66]">Ends {new Date(challenge.end_date).toLocaleDateString()}</span>
                      </div>

                      <h3 className="font-sans font-medium text-sm text-[#1C2826] leading-snug">
                        {challenge.title}
                      </h3>

                      <p className="text-xs text-[#5C6E66] line-clamp-3 leading-relaxed">
                        {challenge.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#103D2A]">{challenge.current_kg} kg collected</span>
                          <span className="text-[#5C6E66]">Target: {challenge.target_kg} kg</span>
                        </div>
                        <div className="w-full bg-[#F0EFE6] rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-[#103D2A] h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    {challenge.is_participating ? (
                      <div className="py-1.5 px-3 bg-[#E8EFE9] text-[#103D2A] rounded-md text-xs font-medium flex items-center justify-center gap-1.5 border border-[#C8D6C9]">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Participating</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        fullWidth
                        size="sm"
                        onClick={() => joinChallenge(challenge.id)}
                      >
                        Join Challenge
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Practical Circular Guides */}
      <div className="space-y-3.5 pt-3">
        <h2 className="font-sans font-medium text-base text-[#1C2826]">
          Practical Circular Guides &amp; Case Studies
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {guides.map((guide, idx) => (
            <div key={idx} className="p-4 flex flex-col justify-between space-y-3 bg-white border border-[#E8E4DA] rounded-lg shadow-subtle hover:border-[#103D2A]/30 transition-all text-left">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#103D2A] font-medium bg-[#E8EFE9] border border-[#C8D6C9] px-2 py-0.5 rounded-md text-[11px]">{guide.category}</span>
                  <span className="text-[#5C6E66]">{guide.readTime}</span>
                </div>

                <h3 className="font-sans font-medium text-sm text-[#1C2826] leading-snug">
                  {guide.title}
                </h3>

                <p className="text-xs text-[#5C6E66] leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-2.5 border-t border-[#E8E4DA]">
                <span className="text-xs font-medium text-[#103D2A] inline-flex items-center gap-1 hover:underline cursor-pointer">
                  <span>Read Field Guide</span>
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
