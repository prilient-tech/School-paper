const User = require('../models/User');
const Subject = require('../models/Subject');
const Chapter = require('../models/Chapter');
const logger = require('./logger');

const seeder = {
  // Create Super Admin user
  async createSuperAdmin() {
    try {
      const existingSuperAdmin = await User.findOne({ role: 'super_admin' });
      
      if (existingSuperAdmin) {
        logger.info('Super Admin already exists');
        return existingSuperAdmin;
      }

      const superAdmin = new User({
        name: 'Super Admin',
        email: 'admin@ai-education.com',
        password: 'admin123',
        role: 'super_admin',
        isActive: true,
        emailVerified: true
      });

      await superAdmin.save();
      logger.info('Super Admin created successfully');
      return superAdmin;
    } catch (error) {
      logger.error('Error creating Super Admin:', error);
      throw error;
    }
  },

  // Create sample subjects
  async createSampleSubjects() {
    try {
      const subjects = [
        {
          name: 'Mathematics',
          code: 'MATH',
          description: 'Advanced mathematics including algebra, calculus, and geometry',
          grade: '10',
          createdBy: await this.getSuperAdminId()
        },
        {
          name: 'Physics',
          code: 'PHY',
          description: 'Fundamental physics concepts and principles',
          grade: '11',
          createdBy: await this.getSuperAdminId()
        },
        {
          name: 'Chemistry',
          code: 'CHEM',
          description: 'Chemical reactions, elements, and compounds',
          grade: '11',
          createdBy: await this.getSuperAdminId()
        },
        {
          name: 'Biology',
          code: 'BIO',
          description: 'Study of living organisms and life processes',
          grade: '12',
          createdBy: await this.getSuperAdminId()
        },
        {
          name: 'Computer Science',
          code: 'CS',
          description: 'Programming, algorithms, and computer systems',
          grade: 'college',
          createdBy: await this.getSuperAdminId()
        }
      ];

      const createdSubjects = [];
      for (const subjectData of subjects) {
        const existingSubject = await Subject.findOne({ code: subjectData.code });
        if (!existingSubject) {
          const subject = new Subject(subjectData);
          await subject.save();
          createdSubjects.push(subject);
          logger.info(`Sample subject created: ${subject.name}`);
        }
      }

      return createdSubjects;
    } catch (error) {
      logger.error('Error creating sample subjects:', error);
      throw error;
    }
  },

  // Create sample chapters
  async createSampleChapters() {
    try {
      const mathSubject = await Subject.findOne({ code: 'MATH' });
      const physicsSubject = await Subject.findOne({ code: 'PHY' });
      const chemistrySubject = await Subject.findOne({ code: 'CHEM' });

      const chapters = [
        // Mathematics chapters
        {
          name: 'Algebra Fundamentals',
          number: 1,
          description: 'Basic algebraic concepts and operations',
          subject: mathSubject._id,
          topics: [
            { name: 'Linear Equations', description: 'Solving linear equations' },
            { name: 'Quadratic Equations', description: 'Solving quadratic equations' },
            { name: 'Polynomials', description: 'Working with polynomials' }
          ],
          createdBy: await this.getSuperAdminId()
        },
        {
          name: 'Calculus Basics',
          number: 2,
          description: 'Introduction to calculus concepts',
          subject: mathSubject._id,
          topics: [
            { name: 'Limits', description: 'Understanding limits' },
            { name: 'Derivatives', description: 'Finding derivatives' },
            { name: 'Integration', description: 'Basic integration techniques' }
          ],
          createdBy: await this.getSuperAdminId()
        },
        // Physics chapters
        {
          name: 'Mechanics',
          number: 1,
          description: 'Classical mechanics and motion',
          subject: physicsSubject._id,
          topics: [
            { name: 'Kinematics', description: 'Motion and velocity' },
            { name: 'Dynamics', description: 'Forces and Newton\'s laws' },
            { name: 'Energy', description: 'Work, energy, and power' }
          ],
          createdBy: await this.getSuperAdminId()
        },
        {
          name: 'Electromagnetism',
          number: 2,
          description: 'Electric and magnetic fields',
          subject: physicsSubject._id,
          topics: [
            { name: 'Electric Fields', description: 'Electric charges and fields' },
            { name: 'Magnetic Fields', description: 'Magnetic forces and fields' },
            { name: 'Electromagnetic Waves', description: 'Light and electromagnetic radiation' }
          ],
          createdBy: await this.getSuperAdminId()
        },
        // Chemistry chapters
        {
          name: 'Atomic Structure',
          number: 1,
          description: 'Atoms, elements, and the periodic table',
          subject: chemistrySubject._id,
          topics: [
            { name: 'Atomic Theory', description: 'Structure of atoms' },
            { name: 'Periodic Table', description: 'Organization of elements' },
            { name: 'Chemical Bonding', description: 'Ionic and covalent bonds' }
          ],
          createdBy: await this.getSuperAdminId()
        },
        {
          name: 'Chemical Reactions',
          number: 2,
          description: 'Types of chemical reactions and stoichiometry',
          subject: chemistrySubject._id,
          topics: [
            { name: 'Reaction Types', description: 'Different types of chemical reactions' },
            { name: 'Stoichiometry', description: 'Calculating reaction quantities' },
            { name: 'Equilibrium', description: 'Chemical equilibrium concepts' }
          ],
          createdBy: await this.getSuperAdminId()
        }
      ];

      const createdChapters = [];
      for (const chapterData of chapters) {
        const existingChapter = await Chapter.findOne({ 
          subject: chapterData.subject, 
          number: chapterData.number 
        });
        if (!existingChapter) {
          const chapter = new Chapter(chapterData);
          await chapter.save();
          createdChapters.push(chapter);
          logger.info(`Sample chapter created: ${chapter.name}`);
        }
      }

      return createdChapters;
    } catch (error) {
      logger.error('Error creating sample chapters:', error);
      throw error;
    }
  },

  // Get Super Admin ID
  async getSuperAdminId() {
    const superAdmin = await User.findOne({ role: 'super_admin' });
    return superAdmin ? superAdmin._id : null;
  },

  // Run all seeders
  async runAll() {
    try {
      logger.info('Starting database seeding...');
      
      await this.createSuperAdmin();
      await this.createSampleSubjects();
      await this.createSampleChapters();
      
      logger.info('Database seeding completed successfully');
    } catch (error) {
      logger.error('Database seeding failed:', error);
      throw error;
    }
  }
};

module.exports = seeder;
