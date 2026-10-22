

var options111 = {
  series: [
    {
      name: "Tier 1",
      data: [4.4, 5.2, 5.9, 7.7, 9.5, 8.1, 6.2, 5.2, 5.5, 7]
    },
    {
      name: "Tier 2",
      data: [4.5, 5.7, 6, 8.7, 8.7, 7.2, 5.9, 5.6, 6.7, 8.3]
    },
    {
      name: "Tier 3",
      data: [5.1, 5.6, 5.7, 6.4, 7.8, 6.9, 5.5, 5.4, 6.6, 8]
    },
    {
      name: "Tier 4",
      data: [4.6, 5.4, 5.4, 6.7, 7.9, 7.5, 5.5, 6.1, 6.2, 8.1]
    },
    {
      name: "APAC",
      data: [5.1, 6.7, 6.7, 7.6, 9.4, 8.8, 6.4, 6.3, 6.9, 7.2]
    },
    {
      name: "Europe",
      data: [3, 3.3, 3.7, 4.8, 6.9, 4.9, 5.3, 6.1, 3.6, 4.8]
    },
    {
      name: "North America",
      data: [.4, 7.3, 8.7, 10.2, 10.7, 9.3, 5.6, 4.8, 8.9, 13.7]
    },
    {
      name: "ME&A",
      data: [3.1, 5.2, 4.6, 7.5, 6.5, 6.9, 5.1, 5.4, 6.8, 9.4]
    },
    {
      name: "LATAM",
      data: [5.2, 4.5, 4.7, 5.3, 6.6, 5.7, 4.9, 6, 8.2, 9.8]
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
    categories: ['Mar25', 'Apr25', 'May25', 'Jun25', 'Jul25', 'Aug25', 'Sep25', 'Oct25', 'Nov25', 'Dec25'],
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