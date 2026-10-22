
// APAC Impressions

var options3 = {
  series: [{
    name: '% of impression occurance',
    data: [25, 9, 9, 9, 8]
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
    categories: ['In-Flight Experience', 'Customer Service Issue', 'Flight Cancellations', 'Staff Attitude and Behavior', 'Flight Delays'],
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
    data: [15, 14, 11, 10, 10]
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
    categories: ['In-Flight Experience', 'Flight Delays', 'Flight Cancellations', 'Rude Staff Behavior', 'Baggage Fees and Policies'],
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
    data: [18, 16, 16, 14, 10]
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
    categories: ['In-Flight Experience', 'Customer Service Issue', 'Flight Delays', 'Flight Cancellations', 'Staff Attitude and Behavior'],
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
    data: [25, 13, 11, 10, 10]
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
    categories: ['Inflight service Quality', 'Customer service experience', 'Booking and Reservation Problems', 'Baggage Handling Problems', 'Flight Delays and Cancellations'],
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
    data: [24, 14, 12, 9, 9]
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
    categories: ['Flight Delays and Cancellations', 'In-Flight Experience', 'Baggage Issues', 'Booking Problems', 'Customer Service Issues'],
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
    data: [12.7, 39.4, 27.1, 13.7, 7.2],
    name: '% of Airlines',
  }, {
    data: [24.9, 42.1, 20.6, 7.3, 5.1],
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
    data: [13.9, 24.3, 29.8, 31.8],
    name: '% of Airlines',
  }, {
    data: [46.7, 27.9, 16.4, 9.1],
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
    data: [9.9, 6.5, 5, 5.9, 5.2]
  }, {
    name: 'Avg. % Total Disruption',
    data: [24.4, 23.7, 19.1, 21, 15.7]
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
    data: [5.7, 6.5, 6.9, 6.1]
  }, {
    name: 'Avg. % Total Disruption',
    data: [19.9, 22.1, 23.1, 20.5]
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