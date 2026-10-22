

var options111 = {
  series: [
    {
      name: "Tier 1",
      data: [7.2, 6.1, 5.5, 8.4, 6.8, 9.8, 12.4, 9.8, 6.5, 4.8, 5, 5.3]
    },
    {
      name: "Tier 2",
      data: [7.4, 5.5, 4.7, 5.8, 5.3, 7.6, 10.3, 8.5, 6.5, 4.8, 5.2, 5.7]
    },
    {
      name: "Tier 3",
      data: [7.1, 6.3, 6, 7, 5.8, 7.8, 8.7, 7.5, 5.7, 4.9, 5.1, 6.1]
    },
    {
      name: "Tier 4",
      data: [7.1, 6.7, 5.1, 7.1, 5.8, 7.8, 9.2, 8, 6.6, 5, 6.1, 6.2]
    },
    {
      name: "APAC",
      data: [7.1, 8, 5.6, 9.3, 6.8, 9.8, 12.2, 10.1, 7.1, 5, 6.4, 5.2]
    },
    {
      name: "Europe",
      data: [5.3, 3.8, 3.3, 3.9, 4.5, 7.3, 8.8, 6.3, 6.2, 4.4, 4, 4.8]
    },
    {
      name: "North America",
      data: [13.2, 7.2, 9.4, 7.1, 9.2, 9.5, 12.4, 11.7, 6.2, 5.7, 6.4, 11.4]
    },
    {
      name: "ME&A",
      data: [6.1, 5, 4.8, 6.4, 3.6, 4.2, 4.5, 5.4, 4.4, 4.3, 4, 5.1]
    },
    {
      name: "LATAM",
      data: [6.1, 5.1, 4.9, 4.7, 4.8, 5.6, 5.5, 4.9, 5.7, 5.8, 6.4, 5.9]
    },

  ],
  chart: {
    height: 600,
    type: 'line',

    zoom: {
      enabled: false
    },
    toolbar: {
      show: false
    }
  },
  colors: ['#1F77B4', '#FF7F0E', '#2CA02C', '#D62728', '#9467BD', '#8C564B', '#E377C2', '#7F7F7F', '#BCBD22', '#17BECF', '#FFBB78']
  ,
  stroke: {
    curve: 'straight',
    width: [3, 3, 3, 3, 3, 3, 3, 3, 3],
    dashArray: [0, 0, 0, 0, 5, 5, 5, 5, 5]
  },
  grid: {
    borderColor: '#e7e7e7',
  },
  markers: {
    size: 1
  },
  xaxis: {
    categories: ['Jan24', 'Feb24', 'Mar24', 'Apr24', 'May24', 'Jun24', 'Jul24', 'Aug24', 'Sep24', 'Oct24', 'Nov24', 'Dec24'],
    title: {
      text: 'Month'
    }
  },
  yaxis: {
    title: {
      text: 'ImPax'
    }
  },
  legend: {
    position: 'top',
    horizontalAlign: 'right',
    floating: true,
    offsetY: 0,
    offsetX: -5
  }
};

var chart111 = new ApexCharts(document.querySelector("#chart111"), options111);
chart111.render();