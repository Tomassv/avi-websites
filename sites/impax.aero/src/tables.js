$(document).ready(function () {
    $('.data-table').DataTable({
        order: [6, 'asc'],
        paging: false,
        fixedHeader: true,
        scrollY: 488,
        scrollCollapse: true,
        responsive: true,
        layout: {
            top1: 'searchPanes'
        },
        searchPanes: {
            columns: [3],
            clear: false, 
            controls: false,
            hideCount: true,
            dtOpts: {
                select: {
                    style: 'multi'
                }
            }
        }
    });
});







$(document).ready(function () {
    $('.data-table-10').DataTable({
        order: [5, 'asc'],
        paging: false,
        fixedHeader: true,
        scrollY: 488,
        scrollCollapse: true,
        responsive: true
    });
});