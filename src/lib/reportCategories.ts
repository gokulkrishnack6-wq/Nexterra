import { EnvironmentalIssueType } from '../types';

export interface IssueCategoryOption {
  id: EnvironmentalIssueType;
  title: string;
  desc: string;
}

/**
 * The 5 Environmental Issue Categories for GreenLoop civic incident reporting.
 * Preserves the 4 original categories and adds 'Other Environmental Issue'.
 */
export const ENVIRONMENTAL_ISSUE_CATEGORIES: IssueCategoryOption[] = [
  {
    id: 'overflowing_bin',
    title: 'Overflowing Public Bin',
    desc: 'Waste spilling onto walkway or street',
  },
  {
    id: 'illegal_dumping',
    title: 'Roadside / Vacant Plot Dump',
    desc: 'Commercial or residential unauthorized dumping',
  },
  {
    id: 'plastic_burning',
    title: 'Open Waste / Plastic Burning',
    desc: 'Smoke and air pollution hazards',
  },
  {
    id: 'water_pollution',
    title: 'Drain / Canal Contamination',
    desc: 'Solid waste accumulating in water bodies',
  },
  {
    id: 'other',
    title: 'Other Environmental Issue',
    desc: 'Unlisted environmental hazards, spills, or civic concerns',
  },
];

/**
 * Returns user-facing label for any environmental issue type.
 */
export const getIssueTypeLabel = (type: string | undefined | null): string => {
  if (!type) return 'Environmental Issue';
  switch (type) {
    case 'overflowing_bin':
      return 'Overflowing Public Bin';
    case 'illegal_dumping':
      return 'Roadside / Vacant Plot Dump';
    case 'plastic_burning':
      return 'Open Waste / Plastic Burning';
    case 'water_pollution':
      return 'Drain / Canal Contamination';
    case 'other':
      return 'Other Environmental Issue';
    default:
      return type.replace(/_/g, ' ');
  }
};
