
// APAC Impressions

var options3 = {
  series: [{
    name: '% of impression occurance',
    data: [29, 24, 19, 18, 9]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Customer service', 'Flight Delays and Cancellations', 'In-Flight Experience', 'Staff Behavior And Professionalism', 'Booking And Ticketing'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart3 = new ApexCharts(document.querySelector("#chart3"), options3);
chart3.render();



// Europe Impressions

var options4 = {
  series: [{
    name: '% of impression occurance',
    data: [33, 27, 14, 14, 11]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Customer Service', 'Flight Delays and Cancellations', 'Baggage Handling', 'Staff Behavior And Professionalism', 'In-Flight Experience'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart4 = new ApexCharts(document.querySelector("#chart4"), options4);
chart4.render();


// North America Impressions

var options5 = {
  series: [{
    name: '% of impression occurance',
    data: [40, 31, 11, 8, 7]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Customer Service', 'Flight Delays and Cancellations', 'Baggage Handling', 'Airport Experience', 'In-Flight Experience'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart5 = new ApexCharts(document.querySelector("#chart5"), options5);
chart5.render();



// Middle East and Africa Impressions

var options6 = {
  series: [{
    name: '% of impression occurance',
    data: [32, 21, 18, 15, 12]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Customer Service', 'In-Flight Experience', 'Flight Delays And Cancellations', 'End-to-End Experience', 'Flight Comfort & Aircraft Quality'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart6 = new ApexCharts(document.querySelector("#chart6"), options6);
chart6.render();



// Latin America Impressions

var options7 = {
  series: [{
    name: '% of impression occurance',
    data: [36, 27, 14, 11, 10]
  }],
  colors: ['#382AFA'],
  chart: {
    type: 'bar',
    height: 350
  },
  plotOptions: {
    bar: {
      borderRadius: 4,
      horizontal: true
    }
  },
  dataLabels: {
    enabled: false
  },
  grid: {
    show: false,
  },
  xaxis: {
    categories: ['Customer Service', 'Flight Delays and Cancellations', 'In-Flight Experience', 'Baggage Handling', 'Refund And Compensation'],
    axisBorder: {
      show: false,
    },
    labels: {
      style: {
        colors: ['#0B037D'],
        fontSize: '14px',
        fontFamily: 'Onest, sans-serif',
      },
      formatter: function (value) {
        return value + '%';
      },
    },
  },
  yaxis: {
    labels: {
      maxWidth: 300,
      style: {
        colors: ['#0B037D'],
        fontSize: '16px',
        fontWeight: '500',
        fontFamily: 'Onest, sans-serif',
      },
    }
  }
};

var chart7 = new ApexCharts(document.querySelector("#chart7"), options7);
chart7.render();



// Airlines vs. Global Disruptions by Regions

var options1 = {
  series: [{
    data: [12.2, 39.1, 28.2, 13.6, 6.8],
    name: '% of Airlines',
  }, {
    data: [22.7, 40, 26.4, 7.2, 3.7],
    name: '% of Global Disruption'
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430
  },
  plotOptions: {
    bar: {
      horizontal: true,
      dataLabels: {
        position: 'top',
      },
    }
  },
  dataLabels: {
    enabled: true,
    offsetX: -6,
    style: {
      fontSize: '14px',
    },
    formatter: function (value) {
      return value + '%';
    }
  },
  stroke: {
    show: true,
    width: 1,
    colors: ['#fff']
  },
  tooltip: {
    shared: true,
    intersect: false
  },
  xaxis: {
    categories: ['North America', 'APAC', 'Europe', 'ME&A', 'LATAM'],
  },
};

var chart1 = new ApexCharts(document.querySelector("#chart1"), options1);
chart1.render();




// Airlines vs. Global Disruptions by Tiers


var options9 = {
  series: [{
    data: [14.7, 23.5, 29.6, 32.3],
    name: '% of Airlines',
  }, {
    data: [44.9, 26.9, 13.8, 9.4],
    name: '% of Global Disruption'
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430
  },
  plotOptions: {
    bar: {
      horizontal: true,
      dataLabels: {
        position: 'top',
      },
    }
  },
  dataLabels: {
    enabled: true,
    offsetX: -6,
    style: {
      fontSize: '14px',
    },
    formatter: function (value) {
      return value + '%';
    }
  },
  stroke: {
    show: true,
    width: 1,
    colors: ['#fff']
  },
  tooltip: {
    shared: true,
    intersect: false
  },
  xaxis: {
    categories: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'],
  },
};

var chart9 = new ApexCharts(document.querySelector("#chart9"), options9);
chart9.render();


//Average ImPax vs. Total Disruption | Regional

var options22 = {
  series: [{
    name: 'Avg. ImPax %',
    data: [9.3, 8.8, 4.9, 6.9, 5.7]
  }, {
    name: 'Avg. % Total Disruption',
    data: [24, 26.8, 23.4, 24.4, 17.1]
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430,
    toolbar: {
      show: false
    },
    zoom: {
      enabled: true
    }
  },
  responsive: [{
    breakpoint: 480,
    options: {
      legend: {
        position: 'bottom',
        offsetX: -10,
        offsetY: 0
      }
    }
  }],
  plotOptions: {
    bar: {
      horizontal: false,
      dataLabels: {
        total: {
          enabled: false,
          style: {
            fontSize: '13px',
            fontWeight: 900
          }
        }
      }
    },
  },
  xaxis: {
    categories: ['North America', 'APAC', 'Europe', 'ME&A', 'LATAM'],
  },
  legend: {
    position: 'bottom',
    offsetY: 10
  },
  fill: {
    opacity: 1
  }
};

var chart22 = new ApexCharts(document.querySelector("#chart22"), options22);
chart22.render();

//Average ImPax vs. Total Disruption | By Tiers

var options23 = {
  series: [{
    name: 'Avg. ImPax %',
    data: [8.1, 7.2, 6.9, 7.5]
  }, {
    name: 'Avg. % Total Disruption',
    data: [24.9, 25.4, 24.3, 23.9]
  }],
  colors: ['#382AFA', '#ACA6FC'],
  chart: {
    type: 'bar',
    height: 430,
    toolbar: {
      show: false
    },
    zoom: {
      enabled: true
    }
  },
  responsive: [{
    breakpoint: 480,
    options: {
      legend: {
        position: 'bottom',
        offsetX: -10,
        offsetY: 0
      }
    }
  }],
  plotOptions: {
    bar: {
      horizontal: false,
      dataLabels: {
        total: {
          enabled: false,
          style: {
            fontSize: '13px',
            fontWeight: 900
          }
        }
      }
    },
  },
  xaxis: {
    categories: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'],
  },
  legend: {
    position: 'bottom',
    offsetY: 10
  },
  fill: {
    opacity: 1
  }
};

var chart23 = new ApexCharts(document.querySelector("#chart23"), options23);
chart23.render();