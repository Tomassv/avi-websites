
// APAC Impressions

var options3 = {
  series: [{
    name: '% of impression occurance',
    data: [25, 19, 17, 8, 6]
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
    categories: ['Customer service', 'Inflight comfort and Seating', 'Flight Delays and Cancellations', 'Positive Travel Experience', 'Food and Beverage Quality'],
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
    data: [31, 30, 20, 8, 7]
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
    categories: ['Customer Service', 'Flight Delays and Cancellations', 'In-Flight Experience', 'Seating and Legroom', 'Staff and Service Experiences'],
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
    data: [30, 27, 10, 7, 7]
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
    categories: ['Customer Service', 'Flight Delays and Cancellations', 'Booking and Refunds', 'Communication and Transparency', 'Baggage Handling'],
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
    data: [33, 24, 7, 6, 6]
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
    categories: ['Customer Service', 'In-Flight Experience', 'Food and Beverage', 'Flight Delays and Cancellations', 'In-Flight Entertainment'],
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
    data: [22, 19, 11, 10, 10]
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
    categories: ['Flight Delays and Cancellations', 'Customer Service Issues', 'Refund and compensation disputes', 'Baggage Issues', 'Booking and Check-In Process'],
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
    data: [12.7, 39.5, 27.5, 13.4, 6.9],
    name: '% of Airlines',
  }, {
    data: [29.2, 34.5, 25.9, 6.4, 4.1],
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
    data: [14.7, 23.7, 29.9, 31.6],
    name: '% of Airlines',
  }, {
    data: [59, 15.1, 12.9, 8.3],
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
    data: [10.2, 7.6, 4.8, 7.5, 5.3]
  }, {
    name: 'Avg. % Total Disruption',
    data: [25.1, 22.3, 22.4, 21.2, 18]
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
    data: [7.7, 8.7, 6.4, 6.7]
  }, {
    name: 'Avg. % Total Disruption',
    data: [23.2, 25.7, 21.4, 20.9]
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