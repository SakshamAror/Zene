import { useAuth } from '../../hooks/useAuth';
import AuthForm from '../../components/AuthForm';
import JournalEntry from '../../components/JournalEntry';
import GoalsList from '../../components/GoalsList';
import {
  getMeditationSessions,
  getWorkSessions,
  getJournalLogs,
  getGoals
} from '../../lib/saveData';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [journalContent, setJournalContent] = useState('');
  const [stats, setStats] = useState({
    totalMeditation: 0,
    totalWork: 0,
    completedGoals: 0,
    journalEntries: 0,
  });

  useEffect(() => {
    if (user) {
      loadStats();
      loadTodayJournal();
    }
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    
    try {
      const [meditations, workSessions, goals, journals] = await Promise.all([
        getMeditationSessions(user.id),
        getWorkSessions(user.id),
        getGoals(user.id),
        getJournalLogs(user.id),
      ]);

      const totalMeditation = meditations.reduce((sum, session) => sum + session.length, 0);
      const totalWork = workSessions.reduce((sum, session) => sum + session.length, 0);
      const completedGoals = goals.filter(goal => goal.completed).length;

      setStats({
        totalMeditation: Math.floor(totalMeditation / 60),
        totalWork: Math.floor(totalWork / 60),
        completedGoals,
        journalEntries: journals.length,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadTodayJournal = async () => {
    if (!user) return;
    
    try {
      const journals = await getJournalLogs(user.id);
      const today = new Date().toISOString().split('T')[0];
      const todayJournal = journals.find(journal => journal.date === today);
      setJournalContent(todayJournal?.log || '');
    } catch (error) {
      console.error('Error loading journal:', error);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Zene</Text>
          <Text style={styles.subtitle}>Great Minds don't wander. They Conquer</Text>
        </View>

        {/* Welcome Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back!</Text>
          <Text style={styles.cardSubtitle}>
            Ready to continue your mindful journey today?
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Leaf size={20} color="#d97706" />
              <Text style={styles.statLabel}>Meditation</Text>
            </View>
            <Text style={styles.statValue}>
              {formatTime(stats.totalMeditation)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <Clock size={20} color="#d97706" />
              <Text style={styles.statLabel}>Focus Work</Text>
            </View>
            <Text style={styles.statValue}>
              {formatTime(stats.totalWork)}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <CheckCircle size={20} color="#d97706" />
              <Text style={styles.statLabel}>Goals</Text>
            </View>
            <Text style={styles.statValue}>
              {stats.completedGoals}
            </Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statHeader}>
              <BookOpen size={20} color="#d97706" />
              <Text style={styles.statLabel}>Journal</Text>
            </View>
            <Text style={styles.statValue}>
              {stats.journalEntries}
            </Text>
          </View>
        </View>

        {/* Today's Journal */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today's Journal</Text>
          <JournalEntry
            userId={user.id}
            initialContent={journalContent}
            onContentChange={setJournalContent}
          />
        </View>

        {/* Goals Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your Goals</Text>
          <GoalsList userId={user.id} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffdf7',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#fffdf7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#92400e',
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#b45309',
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 16,
    color: '#b45309',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 16,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b45309',
    marginLeft: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#92400e',
  },
});