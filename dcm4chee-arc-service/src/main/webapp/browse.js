(function () {
    var query = document.getElementById("query"),
        back = document.getElementById("back"),
        next = document.getElementById("next"),
        aetField = document.getElementById("aet"),
        limitField = document.getElementById("limit"),
        orderByField = document.getElementById("orderby"),
        fromStudyDateField = document.getElementById("fromStudyDate"),
        toStudyDateField = document.getElementById("toStudyDate"),
        fromStudyTimeField = document.getElementById("fromStudyTime"),
        toStudyTimeField = document.getElementById("toStudyTime"),
        inputFields = document.getElementsByTagName("input"),
        offset = 0,

        QIDO_PATH = "rs/qido/",

        ATTRS_HEADER = "<td><a href='#' title='Hide Attributes'>X</a></td>"
            + "<th>Attribute Name</th>"
            + "<th>Tag</th>"
            + "<th>VR</th>"
            + "<th>Value</th>",

        SHOW_ATTRS = "<a href='#' title='Show Attributes'>A</a>",

        SEARCH_SERIES = "<a href='#' title='Search Series'>S</a>",

        SERIES_HEADER = "<td colspan='2'>"
            + "<a href='#' title='Hide Series'>X</a>&nbsp;"
            + "<a href='#' title='Previous Series'>&lt;</a>&nbsp;"
            + "<a href='#' title='Next Series'>&gt;</a>"
            +"</td>"
            + "<th colspan='2'>Station Name</th>"
            + "<th>Series #</th>"
            + "<th>PPS Date</th>"
            + "<th>PPS Time</th>"
            + "<th>Body Part</th>"
            + "<th>Modality</th>"
            + "<th colspan='2'>Series Description</th>"
            + "<th>#I</th>",

        SEARCH_INSTANCES = "<a href='#' title='Search Instances'>S</a>",

        INSTANCE_HEADER = "<td colspan='2'>"
            + "<a href='#' title='Hide Instances'>X</a>&nbsp;"
            + "<a href='#' title='Previous Instances'>&lt;</a>&nbsp;"
            + "<a href='#' title='Next Instances'>&gt;</a>"
            + "</td>"
            + "<th>SOP Class UID</th>"
            + "<th>Instance #</th>"
            + "<th>Content Date</th>"
            + "<th>Content Time</th>"
            + "<th colspan='5'>Content Description</th>",

        APPLICATION_DICOM = "&contentType=application/dicom",

        IMAGE_JPEG_FRAME_NUMBER = "&contentType=image/jpeg&frameNumber=",

        search = function (url, onSuccess) {
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function() {
                if (this.readyState === 4) {
                    if (this.status === 200) {
                        onSuccess.call(null, this.responseText 
                                ? JSON.parse(this.responseText)
                                : []);
                    } else {
                        alert(this.statusText);
                    }
                }
            };
            xhr.open("GET", url, true);
            xhr.setRequestHeader("accept", "application/json");
            xhr.send();
        },

        searchStudies = function () {
            var url = QIDO_PATH
                + aetField.value
                + "/studies?includefield=all&offset="
                + offset
                + "&orderby="
                + orderByField.options[orderByField.selectedIndex].value
                + rangeOf("&StudyDate=",
                        fromStudyDateField.value,
                        toStudyDateField.value)
                + rangeOf("&StudyTime=",
                        fromStudyTimeField.value,
                        toStudyTimeField.value),
            max = inputFields.length,
            field, i;

            for (i = 0; i < max; i += 1) {
                field = inputFields[i];
                if (field.type === "checkbox"
                        ? field.checked
                        : field.name && field.value) {
                    url += '&' + field.name + '=' + field.value;
                }
            }
            search(url, updateStudies);
        },

        rangeOf = function (prefix, from, to) {
            var value = prefix,
                noDigit = /\D/g;

            if (!from && !to) {
                return "";
            }
            if (from) {
                value += from.replace(noDigit,"");
            }
            if (to !== from) {
                value += "-";
                if (to) {
                    value += to.replace(noDigit,"")
                }
            }
            return value;
        },

        searchSeries = function (offset, studyUID, row, studyExpand) {
            var url = QIDO_PATH
                + aetField.value
                + "/studies/"
                + studyUID
                + "/series?includefield=all&orderby=SeriesNumber&offset="
                + offset
                + "&limit="
                + limitField.value;

            search(url, function (series) {
                expandStudy(offset, studyUID, series, row, studyExpand);
            });
        },

        searchInstances = function (offset, studyUID, seriesUID, row,
                studyExpand, seriesExpand) {
            var url = QIDO_PATH
                + aetField.value
                + "/studies/"
                + studyUID
                + "/series/"
                + seriesUID
                + "/instances?includefield=all&orderby=InstanceNumber&offset="
                + offset
                + "&limit="
                + limitField.value;

            search(url, function (instances) {
                expandSeries(offset, studyUID, seriesUID, instances, row,
                        studyExpand, seriesExpand);
            });
        },

        updateStudies = function (studies) {
            var prev = document.getElementById("list"),
                list = document.createElement("tbody"),
                first = offset + 1,
                max = studies.length,
                i;

            list.id="list";
            for (i = 0; i < max; i += 1) {
                addStudyRow(list, first+i, studies[i]);
            }
            prev.parentNode.replaceChild(list, prev);
        },

        addStudyRow = function (list, n, study) {
            var row = document.createElement("tr"),
                studyUID = study.StudyInstanceUID.Value[0],
                retrieveURI = study.RetrieveURI.Value[0],
                studyExpand, cell, showAttributesLink, searchSeriesLink;

            row.className = "study";
            studyExpand = row.insertCell(-1),
            cell = row.insertCell(-1),
            cell.innerHTML = SHOW_ATTRS 
                + "&nbsp;<a href='" + retrieveURI + "' title='Download Study'>D</a>&nbsp;"
                + SEARCH_SERIES;
            showAttributesLink = cell.firstChild;
            searchSeriesLink = cell.lastChild;
            insertCell(row, 3, pnOf(study.PatientName));
            insertCell(row, 1, valueOf(study.PatientID));
            insertCell(row, 1, dateOf(study.StudyDate));
            insertCell(row, 1, timeOf(study.StudyTime));
            insertCell(row, 1, valueOf(study.AccessionNumber));
            insertCell(row, 1, valueOf(study.ModalitiesInStudy));
            insertCell(row, 1, valueOf(study.StudyDescription));
            insertCell(row, 1, valueOf(study.NumberOfStudyRelatedSeries));
            insertCell(row, 1, valueOf(study.NumberOfStudyRelatedInstances));

            showAttributesLink.onclick = function () {
                showAttributes(row, showAttributesLink, 12, study, [ studyExpand ]);
            };

            studyExpand.innerHTML = n + ".";
            searchSeriesLink.onclick = function () {
                collapseStudy(row, studyExpand);
                searchSeries(0, studyUID, row, studyExpand);
            };
            list.appendChild(row);
        },

        insertCell = function(row, colSpan, val) {
            var cell = row.insertCell(-1);

            cell.colSpan = colSpan;
            cell.innerHTML = val;
        },

        insertAfter = function(parent, newItem, existingItem) {
            var after = existingItem.nextSibling;

            if (after) {
                parent.insertBefore(newItem, after);
            } else {
                parent.appendChild(newItem);
            }
        },

        expandStudy = function(offset, studyUID, series, row, studyExpand) {
            var next = row.nextSibling,
                frag = document.createDocumentFragment(),
                headers = document.createElement("tr"),
                cell, collapseStudyLink, previousSeriesLink, nextSeriesLink,
                first = offset + 1,
                max = series.length,
                i;

            headers.className = "series";
            headers.innerHTML = SERIES_HEADER;
            cell = headers.firstChild;
            collapseStudyLink = cell.firstChild;
            previousSeriesLink = collapseStudyLink.nextSibling.nextSibling;
            nextSeriesLink = cell.lastChild;
            frag.appendChild(headers);
            for (i = 0; i < max; i += 1) {
                addSeriesRow(frag, first+i, series[i], studyExpand);
            }
            
            insertAfter(row.parentNode, frag, 
                    attributesShown(next) ? next : row);
            studyExpand.rowSpan = studyExpand.rowSpan + 1 + max;
            collapseStudyLink.onclick = function () {
                collapseStudy(row, studyExpand);
            };
            previousSeriesLink.onclick = function () {
                var offset1 = Math.max(0, offset - parseInt(limitField.value,10));

                collapseStudy(row, studyExpand);
                searchSeries(offset1, studyUID, row, studyExpand);
            };
            nextSeriesLink.onclick = function () {
                var offset1 = offset + parseInt(limitField.value,10);

                collapseStudy(row, studyExpand);
                searchSeries(offset1, studyUID, row, studyExpand);
            };
        },

        addSeriesRow = function (list, n, series, studyExpand) {
            var row = document.createElement("tr"),
                studyUID = series.StudyInstanceUID.Value[0],
                seriesUID = series.SeriesInstanceUID.Value[0],
                retrieveURI = series.RetrieveURI.Value[0],
                seriesExpand, cell, showAttributesLink, searchInstancesLink;

            row.className = "series";
            seriesExpand = row.insertCell(-1),
            cell = row.insertCell(-1),
            cell.innerHTML = SHOW_ATTRS
                + "&nbsp;<a href='" + retrieveURI + "' title='Download Series'>D</a>&nbsp;"
                + SEARCH_INSTANCES;
            showAttributesLink = cell.firstChild;
            searchInstancesLink = cell.lastChild;;
            insertCell(row, 2, valueOf(series.StationName));
            insertCell(row, 1, valueOf(series.SeriesNumber));
            insertCell(row, 1, dateOf(series.PerformedProcedureStepStartDate));
            insertCell(row, 1, timeOf(series.PerformedProcedureStepStartTime));
            insertCell(row, 1, valueOf(series.BodyPartExamined));
            insertCell(row, 1, valueOf(series.Modality));
            insertCell(row, 2, valueOf(series.SeriesDescription));
            insertCell(row, 1, valueOf(series.NumberOfSeriesRelatedInstances));

            showAttributesLink.onclick = function () {
                showAttributes(row, showAttributesLink, 11, series, [ studyExpand, seriesExpand ]);
            };

            seriesExpand.innerHTML = n + ".";
            searchInstancesLink.onclick = function () {
                collapseSeries(row, studyExpand, seriesExpand);
                searchInstances(0, studyUID, seriesUID, row,
                        studyExpand, seriesExpand);
            };
            list.appendChild(row);
        },

        collapseStudy = function (row, studyExpand) {
            var remove = studyExpand.rowSpan - 1,
                parent = row.parentNode,
                prev = row.nextSibling,
                next,
                i;

            if (attributesShown(prev)) {
                prev = prev.nextSibling;
                remove -= 1;
            }
            for (i = 0; i < remove; i += 1) {
                next = prev.nextSibling;
                parent.removeChild(prev);
                prev = next;
            }
            studyExpand.rowSpan = studyExpand.rowSpan - remove;
        },

        expandSeries = function(offset, studyUID, seriesUID, instances, row,
                studyExpand, seriesExpand) {
            var next = row.nextSibling,
                frag = document.createDocumentFragment(),
                headers = document.createElement("tr"),
                cell, collapseSeriesLink, previousInstancesLink, nextInstancesLink,
                first = offset + 1,
                max = instances.length,
                i;

            headers.className = "instance";
            headers.innerHTML = INSTANCE_HEADER;
            cell = headers.firstChild;
            collapseSeriesLink = cell.firstChild;
            previousInstancesLink = collapseSeriesLink.nextSibling.nextSibling;
            nextInstancesLink = cell.lastChild;
            frag.appendChild(headers);
            for (i = 0; i < max; i += 1) {
                addInstanceRow(frag, first+i, instances[i],
                        studyExpand, seriesExpand);
            }

            insertAfter(row.parentNode, frag, 
                    attributesShown(next) ? next : row);
            studyExpand.rowSpan = studyExpand.rowSpan + max + 1;
            seriesExpand.rowSpan = seriesExpand.rowSpan + max + 1;
            seriesExpand.onclick = null;
            collapseSeriesLink.onclick = function () {
                collapseSeries(row, studyExpand, seriesExpand);
            };
            previousInstancesLink.onclick = function () {
                var offset1 = Math.max(0, offset - parseInt(limitField.value,10));

                collapseSeries(row, studyExpand, seriesExpand);
                searchInstances(offset1, studyUID, seriesUID, row,
                        studyExpand, seriesExpand);
            };
            nextInstancesLink.onclick = function () {
                var offset1 = offset + parseInt(limitField.value,10);

                collapseSeries(row, studyExpand, seriesExpand);
                searchInstances(offset1, studyUID, seriesUID, row,
                        studyExpand, seriesExpand);
            };
        },

        wadoURIof = function (rsuri) {
            return rsuri.replace("/studies/", "?requestType=WADO&studyUID=")
                        .replace("/series/", "&seriesUID=")
                        .replace("/instances/", "&objectUID=");
        },

        createFrameSelect = function (frames) {
            var select = document.createElement("select"),
                option, i;

            select.setAttribute("title","Frame"); 
            for (i = 0; i < frames; i += 1) {
                option = document.createElement("option");
                option.text = i+1;
                select.add(option, null);
            }
            return select;
        },

        addInstanceRow = function (list, n, inst, studyExpand, seriesExpand) {
            var row = document.createElement("tr"),
                dateAttr = inst.ContentDate,
                timeAttr = inst.ContentTime,
                wadouri = wadoURIof(inst.RetrieveURI.Value[0]),
                frameSelect = inst.NumberOfFrames && inst.NumberOfFrames.Value[0] > 1
                        && createFrameSelect(inst.NumberOfFrames.Value[0]),
                cell, showAttributesLink, viewLink;

            row.className = "instance";
            row.insertCell(-1).innerHTML = n + ".";
            cell = row.insertCell(-1),
            cell.innerHTML = SHOW_ATTRS
                + "&nbsp;<a href='"
                + wadouri + APPLICATION_DICOM
                + "' title='Download Object'>D</a>"
                + "&nbsp;<a href='"
                + wadouri + APPLICATION_DICOM + "&transferSyntax=*"
                + "' title='Download Compressed Object'>C</a>"
                + "&nbsp;<a href='#' title='View'>V</a>";
            showAttributesLink = cell.firstChild;
            viewLink = cell.lastChild;

            if (frameSelect) {
                cell.appendChild(document.createTextNode('\u00a0'));
                cell.appendChild(frameSelect);
            }
            if (!dateAttr) {
                dateAttr = inst.PresentationCreationDate;
                timeAttr = inst.PresentationCreationTime;
            }
            insertCell(row, 1, valueOf(inst.SOPClassUID));
            insertCell(row, 1, valueOf(inst.InstanceNumber));
            insertCell(row, 1, dateOf(dateAttr));
            insertCell(row, 1, timeOf(timeAttr));
            insertCell(row, 5, contentDescriptionOf(inst));
    
            showAttributesLink.onclick = function () {
                showAttributes(row, showAttributesLink, 11, inst,
                        [ studyExpand, seriesExpand, row.firstChild ]);
            };
            viewLink.onclick = function () {
                window.open(frameSelect 
                        ? wadouri + IMAGE_JPEG_FRAME_NUMBER
                                + (frameSelect.selectedIndex+1)
                        : wadouri);
            };
            list.appendChild(row);
        },

        collapseSeries = function (row, studyExpand, seriesExpand) {
            var remove = seriesExpand.rowSpan - 1,
                parent = row.parentNode,
                prev = row.nextSibling,
                next,
                i;

            if (attributesShown(prev)) {
                prev = prev.nextSibling;
                remove -= 1;
            }
            for (i = 0; i < remove; i += 1) {
                next = prev.nextSibling;
                parent.removeChild(prev);
                prev = next;
            }
            studyExpand.rowSpan = studyExpand.rowSpan - remove;
            seriesExpand.rowSpan = seriesExpand.rowSpan - remove;
        },

        contentDescriptionOf = function (inst) {
            return inst.ContentDescription ? valueOf(inst.ContentDescription)
                    : inst.Rows ? imageDescriptionOf(inst)
                    : inst.ConceptNameCodeSequence ? srDescriptionOf(inst)
                    : valueOf(inst.SOPClassUID);
        },

        imageDescriptionOf = function (inst) {
            return valueOf(inst.ImageType) 
                + " " + valueOf(inst.Columns) + "x" + valueOf(inst.Rows)
                + (inst.NumberOfFrames && inst.NumberOfFrames.Value[0] > 1
                        ? "x" + valueOf(inst.NumberOfFrames) : "")
                + " " + valueOf(inst.BitsAllocated) + " bit";
        },

        srDescriptionOf = function (inst) {
            var title = valueOf(inst.ConceptNameCodeSequence.Sequence[0].CodeMeaning),
                prefix = "";

            if (inst.PreliminaryFlag) {
                prefix += valueOf(inst.PreliminaryFlag) + " ";
            }
            if (inst.CompletionFlag) {
                prefix += valueOf(inst.CompletionFlag) + " ";
            }
            if (inst.VerificationFlag) {
                prefix += valueOf(inst.VerificationFlag) + " ";
            }
            return prefix + title;
        },

        showAttributes = function (prevRow, link, colSpan, dataset, expands) {
            var row = document.createElement("tr"),
                cell = row.insertCell(-1),
                table = document.createElement("table"),
                headers = table.insertRow(0),
                showAttributes = link.onclick,
                max = expands.length,
                i;

            row.className = "attributes";
            cell.colSpan = colSpan;
            cell.appendChild(table);
            headers.className = "attribute";
            headers.innerHTML = ATTRS_HEADER;
            addAttrsRow(table, dataset, "");
            insertAfter(prevRow.parentNode, row, prevRow);
            for (i = 0; i < max; i += 1) {
                expands[i].rowSpan = expands[i].rowSpan + 1;
            }
            link.onclick = null;
            headers.firstChild.onclick = function () {
                hideAttributes(prevRow, link, expands, showAttributes);
            }
        },

        hideAttributes = function (prevRow, link, expands, showAttributes) {
            var parent = prevRow.parentNode,
                nextRow = prevRow.nextSibling,
                max = expands.length,
                i;

            for (i = 0; i < max; i += 1) {
                expands[i].rowSpan = expands[i].rowSpan - 1;
            }
            parent.removeChild(nextRow);
            link.onclick = showAttributes;
        },

        attributesShown = function (row) {
            return row && row.className === "attributes";
        },

        addAttrsRow = function (table, dataset, level) {
            for (name in dataset) {
                if (dataset.hasOwnProperty(name)) {
                    addAttrRow(table, name, dataset[name], level);
                }
            }
        },

        addAttrRow = function (table, name, attr, level) {
            var row = table.insertRow(-1);

            row.className = "attribute";
            row.insertCell(-1).innerHTML = level;
            row.insertCell(-1).innerHTML = name;
            row.insertCell(-1).innerHTML = tag2str(attr.tag);
            row.insertCell(-1).innerHTML = attr.vr;
            row.insertCell(-1).innerHTML = valueOf2(attr);
            if (attr.Sequence)
                addItemsRow(table, attr.Sequence, level + ">");
        },

        addItemsRow = function (table, sq, level) {
            var max = sq.length,
                i;

            for (i = 0; i < max; i += 1) {
                addItemRows(table, i+1, sq[i], level);
            }
        },

        addItemRows = function (table, n, item, level) {
            var row = table.insertRow(-1);

            row.className = "attribute";
            row.insertCell(-1).innerHTML = level;
            insertCell(row, 4, "Item #" + n);
            addAttrsRow(table, item, level);
        },

        tag2str = function (tag) {
            return "(" + tag.slice(0,4) + "," + tag.slice(4) + ")";
        },

        pnOf = function (attr) {
            return attr && attr.PersonName && attr.PersonName[0].Alphabetic || "&nbsp";
        },

        dateOf = function (attr) {
            return attr && attr.Value && formatDate(attr.Value[0]) || "&nbsp";
        },

        timeOf = function (attr) {
            return attr && attr.Value && formatTime(attr.Value[0]) || "&nbsp";
        },

        formatDate = function (value) {
            return value.slice(0,4) + "-"
                + value.substr(value.length === 10 ? 5 : 4, 2) + "-"
                + value.slice(-2); 
        }

        formatTime = function (value) {
            return value.charAt(2) === ":" 
                ? value.slice(0,8)
                : value.slice(0,2) + ":" + value.slice(2,4) + ":" + value.slice(4,6); 
        }

        valueOf = function (attr) {
            return attr && attr.Value || "&nbsp";
        },

        valueOf2 = function (attr) {
            return attr.Value
                 || attr.PersonName && pnOf(attr)
                 || attr.Sequence && (attr.Sequence.length + " Item")
                 || "&nbsp";
        };
   
    query.onclick = function () {
        offset = 0;
        searchStudies();
    };
    back.onclick = function () {
        offset = Math.max(0, offset - parseInt(limitField.value,10));
        searchStudies();
    };
    next.onclick = function () {
        offset = offset + parseInt(limitField.value,10);
        searchStudies();
    };
}());
