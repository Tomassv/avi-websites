
// APAC Impressions

var options3 = {
  series: [{
    name: '% of impression occurance',
    data: [19, 17, 16, 12, 8]
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
    categories: ['Flight Delays and Cancellations', 'In-Flight Experience', 'Seating and Comfort Concerns', 'Booking and Check-In Difficulties',  'Baggage Handling Problems'],
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
    data: [20, 14, 12, 10, 10]
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
    categories: ['Flight Delays and Cancellations', 'Booking and Check-In Problems', 'Staff Attitude and Behavior', 'Baggage Fees and Policies', 'In-Flight Experience'],
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
    data: [22, 14, 13, 9, 9]
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
    categories: ['Flight Delays and Cancellations', 'Rude Staff Behavior', 'In-Flight Experience', 'Customer Service Issues',  'Booking and Reservation Problems'],
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
    data: [18, 17, 13, 11, 11]
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
    categories: ['In-Flight Experience', 'Rude Staff Behavior', 'Overall Airline Experience', 'Booking and Check-In Problems', 'Flight Delays and Cancellations'],
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
    data: [17, 17, 12, 8, 7]
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
    categories: ['Flight Cancellations', 'Onboard Service Quality', 'Customer Service Issues', 'Flight Delays', 'Flight Changes'],
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
    data: [12.4, 39.9, 27.1, 13.4, 7.2],
    name: '% of Airlines',
  }, {
    data: [18.9, 36.5, 32, 6.9, 5.8],
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
    data: [14.1, 25.1, 30.2, 30.6],
    name: '% of Airlines',
  }, {
    data: [49.4, 27.9, 14.4, 8.3],
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
    data: [5.7, 5, 4.4, 4.3, 5.8]
  }, {
    name: 'Avg. % Total Disruption',
    data: [16.6, 18.7, 20.3, 17.8, 17.7]
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
    data: [4.8, 4.8, 4.9, 5]
  }, {
    name: 'Avg. % Total Disruption',
    data: [18.4, 19.2, 19, 18]
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