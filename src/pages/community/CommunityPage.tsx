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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 space-y-8 text-left">
      {/* Header */}
      <div className="border-b border-[#E8E4DA] pb-5 space-y-1">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl lg:text-[34px] text-[#18251F] tracking-tight">
          Community Drives
        </h1>
        <p className="font-sans text-sm text-[#6F776F] max-w-xl">
          Join local waste collection drives, campus cleanups, and community initiatives across Kerala.
        </p>
      </div>

      {/* Active Challenges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-xl text-gl-charcoal">
            Active Diversion Challenges
          </h2>
          <span className="text-xs text-gl-charcoal-muted font-medium">Real-time kg Tracking</span>
        </div>

        {challenges.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6 text-gl-charcoal-muted" />}
            title="No Active Community Challenges"
            description="There are currently no active community challenges in this area. Check back soon or propose a community collection drive with your local group."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {challenges.map((challenge) => {
              const percentage = Math.min(
                Math.round((challenge.current_kg / challenge.target_kg) * 100),
                100
              );

              return (
                <Card
                  key={challenge.id}
                  variant="elevated"
                  className="flex flex-col justify-between overflow-hidden p-0 bg-white border border-gl-border rounded-2xl shadow-card hover:shadow-card-hover transition-all"
                >
                  <div>
                    <div className="aspect-[16/9] w-full bg-gl-cream relative">
                      <img
                        src={challenge.banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                        alt={challenge.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-gl-forest text-white px-2.5 py-0.5 rounded-full text-xs font-bold shadow-sm">
                        +{challenge.reward_points} PTS
                      </div>
                    </div>

                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between text-xs text-gl-charcoal-muted">
                        <span className="text-[10px] text-gl-dark bg-gl-sage-light border border-gl-sage px-2 py-0.5 rounded-full font-bold uppercase">{challenge.district} Drive</span>
                        <span className="text-gl-charcoal-muted text-xs">Ends {new Date(challenge.end_date).toLocaleDateString()}</span>
                      </div>

                      <h3 className="font-heading font-bold text-base text-gl-charcoal leading-snug">
                        {challenge.title}
                      </h3>

                      <p className="text-xs text-gl-charcoal-muted line-clamp-3 leading-relaxed">
                        {challenge.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-gl-forest">{challenge.current_kg} kg collected</span>
                          <span className="text-gl-charcoal-muted">Target: {challenge.target_kg} kg</span>
                        </div>
                        <div className="w-full bg-gl-cream border border-gl-border rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-gl-forest h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    {challenge.is_participating ? (
                      <div className="py-2 px-3 bg-gl-sage-light text-gl-dark rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border border-gl-sage">
                        <Check className="w-4 h-4 text-gl-fresh" />
                        <span>Participating</span>
                      </div>
                    ) : (
                      <Button
                        variant="primary"
                        fullWidth
                        size="sm"
                        onClick={() => joinChallenge(challenge.id)}
                        className="rounded-xl shadow-sm"
                      >
                        Join Challenge
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Practical Circular Guides */}
      <div className="space-y-4 pt-4">
        <h2 className="font-heading font-bold text-xl text-gl-charcoal">
          Practical Circular Guides &amp; Case Studies
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {guides.map((guide, idx) => (
            <Card key={idx} variant="elevated" className="p-5 flex flex-col justify-between space-y-3 bg-white border border-gl-border rounded-2xl shadow-card hover:shadow-card-hover transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gl-dark font-bold bg-gl-sage-light border border-gl-sage px-2.5 py-0.5 rounded-full text-[10px]">{guide.category}</span>
                  <span className="text-gl-charcoal-muted">{guide.readTime}</span>
                </div>

                <h3 className="font-heading font-bold text-base text-gl-charcoal leading-snug">
                  {guide.title}
                </h3>

                <p className="text-xs text-gl-charcoal-muted leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-gl-border">
                <span className="text-xs font-semibold text-gl-forest inline-flex items-center gap-1 hover:underline cursor-pointer">
                  <span>Read Field Guide</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
