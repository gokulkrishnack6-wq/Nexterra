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
      <div className="space-y-1">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-primary tracking-tight">
          Community Drives
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-xl">
          Join local waste collection drives, campus cleanups, and community initiatives across Kerala.
        </p>
      </div>

      {/* Active Challenges */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-bold text-headline-sm text-primary">
            Active Diversion Challenges
          </h2>
          <span className="font-label-sm text-label-sm text-outline">Real-time kg Tracking</span>
        </div>

        {challenges.length === 0 ? (
          <EmptyState
            icon={<Users className="w-6 h-6" />}
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
                  className="flex flex-col justify-between overflow-hidden p-0"
                >
                  <div>
                    <div className="aspect-[16/9] w-full bg-surface-container relative">
                      <img
                        src={challenge.banner_url || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80'}
                        alt={challenge.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-surface-container-lowest/90 backdrop-blur-sm px-2.5 py-0.5 rounded-full font-label-sm text-label-sm text-primary font-bold shadow-sm">
                        +{challenge.reward_points} PTS
                      </div>
                    </div>

                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
                        <span className="font-label-sm text-xs text-secondary font-semibold uppercase">{challenge.district} Drive</span>
                        <span className="text-outline text-xs">Ends {new Date(challenge.end_date).toLocaleDateString()}</span>
                      </div>

                      <h3 className="font-heading font-semibold text-title-md text-on-surface leading-snug">
                        {challenge.title}
                      </h3>

                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-3 leading-relaxed">
                        {challenge.description}
                      </p>

                      {/* Progress Bar */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between font-label-sm text-xs">
                          <span className="font-semibold text-primary">{challenge.current_kg} kg collected</span>
                          <span className="text-outline">Target: {challenge.target_kg} kg</span>
                        </div>
                        <div className="w-full bg-surface-container rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-primary-container h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 pt-0">
                    {challenge.is_participating ? (
                      <div className="py-2 px-3 bg-secondary-container text-primary rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border border-primary/20">
                        <Check className="w-4 h-4" />
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
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Practical Circular Guides */}
      <div className="space-y-4 pt-4">
        <h2 className="font-heading font-bold text-headline-sm text-primary">
          Practical Circular Guides & Case Studies
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {guides.map((guide, idx) => (
            <Card key={idx} variant="elevated" className="p-5 flex flex-col justify-between space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between font-label-sm text-xs">
                  <span className="text-primary font-bold bg-surface-container px-2 py-0.5 rounded-full">{guide.category}</span>
                  <span className="text-outline">{guide.readTime}</span>
                </div>

                <h3 className="font-heading font-semibold text-title-md text-on-surface leading-snug">
                  {guide.title}
                </h3>

                <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-2 border-t border-outline-variant/40">
                <span className="font-label-md text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline cursor-pointer">
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
