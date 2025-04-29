
const Ticket = require('../models/Ticket'); // adjust path if needed

const getReportSummary = async (req, res) => {
  try {
    const { startDate, endDate, assignedTo, department } = req.query;
    const domain = req.user.domain;

    const query = {
      domain,
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
    };

    if (assignedTo) query.assignedTo = assignedTo;
    if (department) query.department = department;

    const tickets = await Ticket.find(query);

    const total = tickets.length;
    const resolvedOnTime = tickets.filter(t => t.status === 'Closed' && t.slaMet).length;
    const slaPercentage = total ? Math.round((resolvedOnTime / total) * 100) : 0;

    const criticalIssues = tickets.filter(t => t.priority === 'P1').length;
    const avgResolutionTime = (() => {
      const closed = tickets.filter(t => t.status === 'Closed' && t.resolvedAt);
      if (!closed.length) return 0;
      const totalHours = closed.reduce((sum, t) => {
        const created = new Date(t.createdAt);
        const resolved = new Date(t.resolvedAt);
        return sum + (resolved - created) / (1000 * 60 * 60);
      }, 0);
      return (totalHours / closed.length).toFixed(1);
    })();

    const weeklyTrends = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
      const open = tickets.filter(t => {
        const d = new Date(t.createdAt).getDay();
        return d === ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day) && t.status !== 'Closed';
      }).length;

      const closed = tickets.filter(t => {
        const d = new Date(t.createdAt).getDay();
        return d === ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(day) && t.status === 'Closed';
      }).length;

      return { name: day, Open: open, Closed: closed };
    });

    const ticketTypes = ['Incident', 'Service Request', 'Change Request', 'Problem', 'Task'].map(type => ({
      name: type,
      value: tickets.filter(t => t.type === type).length,
    }));

    res.json({
      slaPercentage,
      criticalIssues,
      avgResolutionTime,
      weeklyTrends,
      ticketTypes,
    });
  } catch (err) {
    console.error('Error in report summary:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { getReportSummary };
