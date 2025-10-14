
export type CompetencyPair = {
  taCode: string;
  isicCode: string;
};

export type MasterCourse = {
  id: string;
  title: string;
  facultyCode: string;
  description?: string;
  requiredCompetencies: CompetencyPair[];
};

    