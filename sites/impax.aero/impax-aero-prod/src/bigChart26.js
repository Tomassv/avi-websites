

var options111 = {
  series: [
    {
      name: "Tier 1",
      data: [6.6, 6.5, 7.9, 5, 6.1, 7.3, 10]
    },
    {
      name: "Tier 2",
      data: [7.9, 7.5, 6.8, 4.6, 5.1, 6.4, 8.7]
    },
    {
      name: "Tier 3",
      data: [7.5, 6.7, 8.8, 5.7, 5.3, 7.1, 8.8]
    },
    {
      name: "Tier 4",
      data: [7.5, 7.0, 6.0, 5.2, 5.6, 8.0, 9.4]
    },
    {
      name: "APAC",
      data: [6.8, 7.3, 5.8, 5.2, 5, 7.1, 9.5]
    },
    {
      name: "Europe",
      data: [6.4, 5.4, 4.4, 3.3, 4.6, 7.2, 8.2]
    },
    {
      name: "North America",
      data: [11.6, 9.4, 12.7, 6, 9.2, 8.8, 11.2]
    },
    {
      name: "ME&A",
      data: [7.8, 7.3, 14.3, 7.7, 6.4, 6.5, 9.3]
    },
    {
      name: "LATAM",
      data: [6.1, 6.3, 5.5, 5.5, 5.3, 7.1, 7.8]
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
    categories: ['Jan26', 'Feb26', 'Mar26', 'Apr26', 'May26', 'Jun26', 'Jul26'],
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